import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { AccountsService } from './accounts.service';
import { DB_CONNECTION } from '../../database/injectionTokens';
import { TransactionsService } from '../transactions/transactions.service';

import type { TAccountSelect, TTransactionSelect } from '../../types';

const activeAccount: TAccountSelect = {
  accountId: 1,
  personId: 1,
  balance: '1000.0000',
  dailyWithdrawalLimit: '500.0000',
  isActive: true,
  accountType: 1,
};

const inactiveAccount: TAccountSelect = { ...activeAccount, isActive: false };

const twoTransactions: TTransactionSelect[] = [
  {
    transactionId: 1,
    accountId: 1,
    value: '200.0000',
    transactionDate: new Date(),
  },
  {
    transactionId: 2,
    accountId: 1,
    value: '-100.0000',
    transactionDate: new Date(),
  },
];

const oneTransaction: TTransactionSelect = {
  transactionId: 1,
  accountId: 1,
  value: '100.0000',
  transactionDate: new Date(),
};

const newAccountPayload = {
  personId: 1,
  balance: '0',
  dailyWithdrawalLimit: '500',
  isActive: true,
  accountType: 1,
};

type MockDb = {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  transaction: jest.Mock;
};

type MockTx = {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
};

describe('AccountsService', () => {
  let service: AccountsService;
  let mockDb: MockDb;
  let mockTx: MockTx;
  let mockTransactionsService: jest.Mocked<TransactionsService>;

  // Mocks: db.select().from(table).where(condition)
  const setupSelect = (db: { select: jest.Mock }, result: TAccountSelect[]) => {
    db.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(result),
      }),
    });
  };

  // Mocks: db.update(table).set(values).where(condition).returning()
  const setupUpdate = (db: { update: jest.Mock }, result: TAccountSelect[]) => {
    db.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue(result),
        }),
      }),
    });
  };

  // Mocks: db.select().from(table).where(condition).orderBy(column)
  const setupSelectTransactions = (transactions: TTransactionSelect[]) => {
    mockTx.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockResolvedValue(transactions),
        }),
      }),
    });
  };

  // Mocks: db.select(sum).from(table).where(condition) — used to sum up all transactions after the specified range
  const setupSelectSum = (total: string) => {
    mockTx.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ total }]),
      }),
    });
  };

  beforeEach(async () => {
    mockTx = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    };

    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      transaction: jest
        .fn()
        .mockImplementation((cb: (tx: MockTx) => unknown) => cb(mockTx)),
    };

    mockTransactionsService = {
      insertTransaction: jest.fn(),
      getAmountWithdrawnToday: jest.fn(),
    } as unknown as jest.Mocked<TransactionsService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: DB_CONNECTION, useValue: mockDb },
        { provide: TransactionsService, useValue: mockTransactionsService },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  describe('createAccount', () => {
    it('should create and return an account', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([activeAccount]),
        }),
      });

      const result = await service.createAccount(newAccountPayload);

      expect(result).toEqual(activeAccount);
    });

    it('should throw InternalServerErrorException on DB failure', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(new Error('DB error')),
        }),
      });

      await expect(service.createAccount(newAccountPayload)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('depositFunds', () => {
    it('should throw NotFoundException when account does not exist', async () => {
      setupSelect(mockTx, []);

      await expect(service.depositFunds(99, '100')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when account is inactive', async () => {
      setupSelect(mockTx, [inactiveAccount]);

      await expect(service.depositFunds(1, '100')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should deposit funds and return the updated account', async () => {
      const accountAfterDeposit: TAccountSelect = {
        ...activeAccount,
        balance: '1100.0000',
      };
      setupSelect(mockTx, [activeAccount]);
      setupUpdate(mockTx, [accountAfterDeposit]);
      mockTransactionsService.insertTransaction.mockResolvedValue(
        oneTransaction,
      );

      const result = await service.depositFunds(1, '100');

      expect(result).toEqual(accountAfterDeposit);
      expect(mockTransactionsService.insertTransaction).toHaveBeenCalledWith(
        1,
        '100',
        mockTx,
      );
    });
  });

  describe('withdrawFunds', () => {
    it('should throw NotFoundException when account does not exist', async () => {
      setupSelect(mockTx, []);

      await expect(service.withdrawFunds(99, '100')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when account is inactive', async () => {
      setupSelect(mockTx, [inactiveAccount]);

      await expect(service.withdrawFunds(1, '100')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw UnprocessableEntityException when insufficient funds', async () => {
      setupSelect(mockTx, [{ ...activeAccount, balance: '50.0000' }]);

      await expect(service.withdrawFunds(1, '100')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw UnprocessableEntityException when daily withdrawal limit is exceeded', async () => {
      // balance: 1000, limit: 500, already withdrew: 400 — withdrawing 200 more would total 600
      setupSelect(mockTx, [activeAccount]);
      mockTransactionsService.getAmountWithdrawnToday.mockResolvedValue(
        '-400.0000',
      );

      await expect(service.withdrawFunds(1, '200')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should withdraw funds and return the updated account', async () => {
      const accountAfterWithdrawal: TAccountSelect = {
        ...activeAccount,
        balance: '900.0000',
      };
      setupSelect(mockTx, [activeAccount]);
      mockTransactionsService.getAmountWithdrawnToday.mockResolvedValue('0');
      setupUpdate(mockTx, [accountAfterWithdrawal]);
      mockTransactionsService.insertTransaction.mockResolvedValue(
        oneTransaction,
      );

      const result = await service.withdrawFunds(1, '100');

      expect(result).toEqual(accountAfterWithdrawal);
      expect(mockTransactionsService.insertTransaction).toHaveBeenCalledWith(
        1,
        '-100',
        mockTx,
      );
    });
  });

  describe('getBalance', () => {
    it('should throw NotFoundException when account does not exist', async () => {
      setupSelect(mockDb, []);

      await expect(service.getBalance(99)).rejects.toThrow(NotFoundException);
    });

    it('should return the account balance', async () => {
      setupSelect(mockDb, [activeAccount]);

      const result = await service.getBalance(1);

      expect(result).toBe('1000.0000');
    });
  });

  describe('blockAccount', () => {
    it('should throw NotFoundException when account does not exist', async () => {
      setupUpdate(mockDb, []);

      await expect(service.blockAccount(99)).rejects.toThrow(NotFoundException);
    });

    it('should block and return the account', async () => {
      const blockedAccount: TAccountSelect = {
        ...activeAccount,
        isActive: false,
      };
      setupUpdate(mockDb, [blockedAccount]);

      const result = await service.blockAccount(1);

      expect(result.isActive).toBe(false);
    });
  });

  describe('unblockAccount', () => {
    it('should throw NotFoundException when account does not exist', async () => {
      setupUpdate(mockDb, []);

      await expect(service.unblockAccount(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should unblock and return the account', async () => {
      setupUpdate(mockDb, [activeAccount]);

      const result = await service.unblockAccount(1);

      expect(result.isActive).toBe(true);
    });
  });

  describe('getStatement', () => {
    it('should throw NotFoundException when account does not exist', async () => {
      setupSelect(mockTx, []);

      await expect(service.getStatement(99)).rejects.toThrow(NotFoundException);
    });

    it('should return statement with correct balances (no date range)', async () => {
      // transactions: +200, -100 (+100 total)
      // closingBalance = current balance = 1000
      // openingBalance = 1000 - 100 = 900
      setupSelect(mockTx, [activeAccount]);
      setupSelectTransactions(twoTransactions);

      const result = await service.getStatement(1);

      expect(result.account).toEqual(activeAccount);
      expect(result.closingBalance).toBe('1000.0000');
      expect(result.openingBalance).toBe('900.0000');
      expect(result.transactions).toEqual(twoTransactions);
    });

    it('should return statement with correct balances with an end date', async () => {
      // sum of all transactions after "to": +300
      // closingBalance = 1000 - 300 = 700
      // transactions in range: +200, -100 (+100 total)
      // openingBalance = 700 - 100 = 600
      setupSelect(mockTx, [activeAccount]);
      setupSelectTransactions(twoTransactions);
      setupSelectSum('300.0000');

      const result = await service.getStatement(1, undefined, new Date());

      expect(result.closingBalance).toBe('700.0000');
      expect(result.openingBalance).toBe('600.0000');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';

import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';

import type {
  TAccountSelect,
  TAccountInsert,
  IAccountStatement,
} from '../../types';

const mockAccount: TAccountSelect = {
  accountId: 1,
  personId: 1,
  balance: '1000.0000',
  dailyWithdrawalLimit: '500.0000',
  isActive: true,
  accountType: 1,
};

const mockStatement: IAccountStatement = {
  account: mockAccount,
  openingBalance: '900.0000',
  closingBalance: '1000.0000',
  transactions: [],
};

describe('AccountsController', () => {
  let controller: AccountsController;
  let mockService: jest.Mocked<AccountsService>;

  beforeEach(async () => {
    mockService = {
      createAccount: jest.fn(),
      depositFunds: jest.fn(),
      withdrawFunds: jest.fn(),
      getStatement: jest.fn(),
      getBalance: jest.fn(),
      blockAccount: jest.fn(),
      unblockAccount: jest.fn(),
    } as unknown as jest.Mocked<AccountsService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [{ provide: AccountsService, useValue: mockService }],
    }).compile();

    controller = module.get<AccountsController>(AccountsController);
  });

  it('createAccount — calls service method', async () => {
    const body: TAccountInsert = {
      personId: 1,
      balance: '500',
      dailyWithdrawalLimit: '200',
      isActive: true,
      accountType: 1,
    };
    mockService.createAccount.mockResolvedValue(mockAccount);

    const result = await controller.createAccount(body);

    expect(mockService.createAccount).toHaveBeenCalledWith(body);
    expect(result).toEqual(mockAccount);
  });

  it('depositFunds — calls service method', async () => {
    mockService.depositFunds.mockResolvedValue(mockAccount);

    const result = await controller.depositFunds(1, { amount: '100' });

    expect(mockService.depositFunds).toHaveBeenCalledWith(1, '100');
    expect(result).toEqual(mockAccount);
  });

  it('withdrawFunds — calls service method', async () => {
    mockService.withdrawFunds.mockResolvedValue(mockAccount);

    const result = await controller.withdrawFunds(1, { amount: '50' });

    expect(mockService.withdrawFunds).toHaveBeenCalledWith(1, '50');
    expect(result).toEqual(mockAccount);
  });

  it('getStatement — calls service method', async () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-01-31');
    mockService.getStatement.mockResolvedValue(mockStatement);

    const result = await controller.getStatement(1, { from, to });

    expect(mockService.getStatement).toHaveBeenCalledWith(1, from, to);
    expect(result).toEqual(mockStatement);
  });

  it('getAccountBalance — calls service method', async () => {
    mockService.getBalance.mockResolvedValue('1000.0000');

    const result = await controller.getAccountBalance(1);

    expect(mockService.getBalance).toHaveBeenCalledWith(1);
    expect(result).toBe('1000.0000');
  });

  it('blockAccount — calls service method', async () => {
    const blockedAccount: TAccountSelect = { ...mockAccount, isActive: false };
    mockService.blockAccount.mockResolvedValue(blockedAccount);

    const result = await controller.blockAccount(1);

    expect(mockService.blockAccount).toHaveBeenCalledWith(1);
    expect(result).toEqual(blockedAccount);
  });

  it('unblockAccount — calls service method', async () => {
    mockService.unblockAccount.mockResolvedValue(mockAccount);

    const result = await controller.unblockAccount(1);

    expect(mockService.unblockAccount).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockAccount);
  });
});

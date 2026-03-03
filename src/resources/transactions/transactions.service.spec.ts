import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';

import { TransactionsService } from './transactions.service';
import { DB_CONNECTION } from '../../database/injectionTokens';
import type { TTransactionSelect } from '../../types';

const mockTransaction: TTransactionSelect = {
  transactionId: 1,
  accountId: 1,
  value: '100.0000',
  transactionDate: new Date(),
};

describe('TransactionsService', () => {
  let service: TransactionsService;
  let mockDb: { insert: jest.Mock; select: jest.Mock };

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn(),
      select: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: DB_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  describe('insertTransaction', () => {
    it('should insert and return the transaction', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockTransaction]),
        }),
      });

      const result = await service.insertTransaction(1, '100.0000');

      expect(result).toEqual(mockTransaction);
    });

    it('should throw InternalServerErrorException on DB failure', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(new Error('DB error')),
        }),
      });

      await expect(service.insertTransaction(1, '100.0000')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getAmountWithdrawnToday', () => {
    it('should return "0" when there are no withdrawals today', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: null }]),
        }),
      });

      const result = await service.getAmountWithdrawnToday(1);

      expect(result).toBe('0');
    });

    it('should return the total withdrawn today', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: '-300.0000' }]),
        }),
      });

      const result = await service.getAmountWithdrawnToday(1);

      expect(result).toBe('-300.0000');
    });
  });
});

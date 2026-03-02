import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { and, eq, lt, gte, sum, sql } from 'drizzle-orm';

import { DB_CONNECTION } from '../../database/injectionTokens';

import type { TDatabase, TTransactionSelect } from '../../types';
import { transactions } from 'src/database/schema';

@Injectable()
export class TransactionsService {
  constructor(@Inject(DB_CONNECTION) private readonly db: TDatabase) {}

  async insertTransaction(
    accountId: number,
    value: string,
    db: TDatabase = this.db,
  ): Promise<TTransactionSelect> {
    try {
      const [insertedTransaction] = await db
        .insert(transactions)
        .values({ accountId, value })
        .returning();

      return insertedTransaction;
    } catch {
      throw new InternalServerErrorException('Failed to create transaction');
    }
  }

  async getAmountWithdrawnToday(
    accountId: number,
    db: TDatabase = this.db,
  ): Promise<string> {
    const [result] = await db
      .select({ total: sum(transactions.value) })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          lt(transactions.value, '0'),
          gte(transactions.transactionDate, sql`CURRENT_DATE`),
        ),
      );

    return result.total ?? '0';
  }
}

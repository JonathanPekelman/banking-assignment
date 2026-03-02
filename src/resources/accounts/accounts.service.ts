import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { eq, sql } from 'drizzle-orm';

import { accounts } from '../../database/schema';
import { DB_CONNECTION } from '../../database/injectionTokens';
import { TransactionsService } from '../transactions/transactions.service';

import type { TAccountInsert, TAccountSelect, TDatabase } from '../../types';

@Injectable()
export class AccountsService {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: TDatabase,
    private readonly transactionsService: TransactionsService,
  ) {}

  async createAccount(newAccount: TAccountInsert): Promise<TAccountSelect> {
    try {
      const [createdAccount] = await this.db
        .insert(accounts)
        .values(newAccount)
        .returning();

      return createdAccount;
    } catch {
      throw new InternalServerErrorException('Failed to create account');
    }
  }

  // If creating the transaction fails, the deposit is cancelled.
  async depositFunds(
    accountId: number,
    amountOfFunds: string,
  ): Promise<TAccountSelect> {
    try {
      return await this.db.transaction(async (tx) => {
        const [updatedAccount] = await tx
          .update(accounts)
          .set({
            balance: sql`${accounts.balance} + ${amountOfFunds}::numeric`,
          })
          .where(eq(accounts.accountId, accountId))
          .returning();

        await this.transactionsService.insertTransaction(
          accountId,
          amountOfFunds,
          tx,
        );

        return updatedAccount;
      });
    } catch {
      throw new InternalServerErrorException('Failed to deposit funds.');
    }
  }
}

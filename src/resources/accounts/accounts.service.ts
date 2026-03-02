import {
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import Decimal from 'decimal.js';
import { and, eq, gt, gte, lte, sql, sum } from 'drizzle-orm';

import { accounts, transactions } from '../../database/schema';
import { DB_CONNECTION } from '../../database/injectionTokens';
import { TransactionsService } from '../transactions/transactions.service';

import type {
  TAccountInsert,
  TAccountSelect,
  TDatabase,
  IAccountStatement,
} from '../../types';

@Injectable()
export class AccountsService {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: TDatabase,
    private readonly transactionsService: TransactionsService,
  ) {}

  private async findAccountById(
    accountId: number,
    tx: TDatabase = this.db,
  ): Promise<TAccountSelect> {
    const [account] = await tx
      .select()
      .from(accounts)
      .where(eq(accounts.accountId, accountId));

    if (!account) throw new NotFoundException('Account not found.');

    return account;
  }

  async createAccount(newAccount: TAccountInsert): Promise<TAccountSelect> {
    try {
      const [createdAccount] = await this.db
        .insert(accounts)
        .values(newAccount)
        .returning();

      return createdAccount;
    } catch {
      throw new InternalServerErrorException('Failed to create account.');
    }
  }

  // If creating the transaction fails, the deposit is cancelled.
  async depositFunds(
    accountId: number,
    amountOfFunds: string,
  ): Promise<TAccountSelect> {
    try {
      return await this.db.transaction(async (tx) => {
        const account = await this.findAccountById(accountId, tx);

        if (!account.isActive)
          throw new ForbiddenException('Account is inactive.');

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
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to deposit funds.');
    }
  }

  // If creating the transaction fails, the withdrawal is cancelled.
  async withdrawFunds(
    accountId: number,
    amountOfFunds: string,
  ): Promise<TAccountSelect> {
    try {
      return await this.db.transaction(async (tx) => {
        const account = await this.findAccountById(accountId, tx);

        if (!account.isActive)
          throw new ForbiddenException('Account is inactive.');

        const amount = new Decimal(amountOfFunds);

        if (amount.greaterThan(account.balance))
          throw new UnprocessableEntityException('Insufficient funds.');

        const withdrawnToday =
          await this.transactionsService.getAmountWithdrawnToday(accountId, tx);

        const wouldExceedLimit = new Decimal(withdrawnToday)
          .abs()
          .plus(amount)
          .greaterThan(account.dailyWithdrawalLimit);

        if (wouldExceedLimit)
          throw new UnprocessableEntityException(
            'Daily withdrawal limit exceeded.',
          );

        const negatedAmount = `-${amountOfFunds}`;

        const [updatedAccount] = await tx
          .update(accounts)
          .set({
            balance: sql`${accounts.balance} + ${negatedAmount}::numeric`,
          })
          .where(eq(accounts.accountId, accountId))
          .returning();

        await this.transactionsService.insertTransaction(
          accountId,
          negatedAmount,
          tx,
        );

        return updatedAccount;
      });
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to withdraw funds.');
    }
  }

  async getStatement(
    accountId: number,
    from?: Date,
    to?: Date,
  ): Promise<IAccountStatement> {
    return this.db.transaction(async (tx) => {
      const account = await this.findAccountById(accountId, tx);

      const statementTransactions = await tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, accountId),
            from ? gte(transactions.transactionDate, from) : undefined,
            to ? lte(transactions.transactionDate, to) : undefined,
          ),
        )
        .orderBy(transactions.transactionDate);

      let txSumAfterEndPoint = '0';
      // If end date was not specified, the closing balance is the same as the current balance
      if (to) {
        // Sum up all transactions AFTER end date
        const [afterResult] = await tx
          .select({ total: sum(transactions.value) })
          .from(transactions)
          .where(
            and(
              eq(transactions.accountId, accountId),
              gt(transactions.transactionDate, to),
            ),
          );

        txSumAfterEndPoint = afterResult.total ?? '0';
      }

      // Current balance minus everything after end date equals closing balance
      const closingBalance = new Decimal(account.balance)
        .minus(txSumAfterEndPoint)
        .toFixed(4);

      // Sum of all transactions from start point
      const txSumFromStartPoint = statementTransactions.reduce(
        (acc, t) => acc.plus(t.value),
        new Decimal(0),
      );

      // Current balance minus txSumFromStartPoint equals opening balance
      const openingBalance = new Decimal(closingBalance)
        .minus(txSumFromStartPoint)
        .toFixed(4);

      return {
        account,
        openingBalance,
        closingBalance,
        transactions: statementTransactions,
      };
    });
  }

  async getBalance(accountId: number): Promise<string> {
    try {
      const account = await this.findAccountById(accountId);

      return account.balance;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException(
        'Failed to look up account balance.',
      );
    }
  }

  async blockAccount(accountId: number): Promise<TAccountSelect> {
    try {
      const [updatedAccount] = await this.db
        .update(accounts)
        .set({ isActive: false })
        .where(eq(accounts.accountId, accountId))
        .returning();

      if (!updatedAccount) throw new NotFoundException('Account not found.');

      return updatedAccount;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to block account.');
    }
  }

  async unblockAccount(accountId: number): Promise<TAccountSelect> {
    try {
      const [updatedAccount] = await this.db
        .update(accounts)
        .set({ isActive: true })
        .where(eq(accounts.accountId, accountId))
        .returning();

      if (!updatedAccount) throw new NotFoundException('Account not found.');

      return updatedAccount;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to unblock account.');
    }
  }
}

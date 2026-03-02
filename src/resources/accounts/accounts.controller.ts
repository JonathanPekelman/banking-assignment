import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';

import { AccountsService } from './accounts.service';
import { ZodValidationPipe } from '../../pipes/zod.pipe';
import {
  accountInsertSchema,
  fundsBodySchema,
  statementQuerySchema,
} from '../../schemas/account.schema';

import type {
  TAccountInsert,
  TAccountSelect,
  IAccountStatement,
} from '../../types';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  async createAccount(
    @Body(new ZodValidationPipe(accountInsertSchema))
    newAccount: TAccountInsert,
  ): Promise<TAccountSelect> {
    return this.accountsService.createAccount(newAccount);
  }

  @Post(':accountId/deposit')
  async depositFunds(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Body(new ZodValidationPipe(fundsBodySchema)) body: { amount: string },
  ): Promise<TAccountSelect> {
    return this.accountsService.depositFunds(accountId, body.amount);
  }

  @Post(':accountId/withdraw')
  async withdrawFunds(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Body(new ZodValidationPipe(fundsBodySchema)) body: { amount: string },
  ): Promise<TAccountSelect> {
    return this.accountsService.withdrawFunds(accountId, body.amount);
  }

  @Get(':accountId/statement')
  async getStatement(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Query(new ZodValidationPipe(statementQuerySchema))
    query: { from?: Date; to?: Date },
  ): Promise<IAccountStatement> {
    return this.accountsService.getStatement(accountId, query.from, query.to);
  }

  @Get(':accountId/balance')
  async getAccountBalance(
    @Param('accountId', ParseIntPipe) accountId: number,
  ): Promise<string> {
    return this.accountsService.getBalance(accountId);
  }

  @Post(':accountId/block')
  async blockAccount(
    @Param('accountId', ParseIntPipe) accountId: number,
  ): Promise<TAccountSelect> {
    return this.accountsService.blockAccount(accountId);
  }

  @Post(':accountId/unblock')
  async unblockAccount(
    @Param('accountId', ParseIntPipe) accountId: number,
  ): Promise<TAccountSelect> {
    return this.accountsService.unblockAccount(accountId);
  }
}

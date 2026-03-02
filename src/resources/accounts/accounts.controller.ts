import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';

import { AccountsService } from './accounts.service';
import { ZodValidationPipe } from '../../pipes/zod.pipe';
import {
  accountInsertSchema,
  depositBodySchema,
} from '../../schemas/account.schema';

import type { TAccountInsert, TAccountSelect } from '../../types';

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
    @Body(new ZodValidationPipe(depositBodySchema)) body: { amount: string },
  ): Promise<TAccountSelect> {
    return this.accountsService.depositFunds(accountId, body.amount);
  }
}

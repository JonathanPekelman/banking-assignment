import { z } from 'zod';
import { monetaryField } from './common.schema';

export const accountInsertSchema = z.object({
  personId: z.number().int().positive(),
  balance: monetaryField,
  dailyWithdrawalLimit: monetaryField,
  isActive: z.boolean().default(true),
  accountType: z.number().int().min(1).max(5),
});

export const accountSelectSchema = accountInsertSchema.extend({
  accountId: z.number().int(),
});

export const depositBodySchema = z.object({
  amount: monetaryField,
});

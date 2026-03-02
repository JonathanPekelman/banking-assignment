import { z } from 'zod';
import { monetaryField } from './common.schema';

export const transactionInsertSchema = z.object({
  accountId: z.number().int().positive(),
  value: monetaryField,
});

export const transactionSelectSchema = transactionInsertSchema.extend({
  transactionId: z.number().int(),
  transactionDate: z.coerce.date(),
});

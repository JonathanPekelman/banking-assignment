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

export const fundsBodySchema = z.object({
  amount: monetaryField,
});

const startDateField = z.iso
  .date()
  .transform((dateString) => new Date(dateString))
  .refine((startOfDay) => startOfDay <= new Date(), {
    message: 'Start date cannot be in the future',
  })
  .optional();

// Transactions will be checked until the end of the day
const endDateField = z.iso
  .date()
  .transform((dateString) => {
    const endOfDay = new Date(dateString);
    endOfDay.setUTCHours(23, 59, 59, 999);
    return endOfDay;
  })
  .refine(
    (endOfDay) => {
      const endOfToday = new Date();
      endOfToday.setUTCHours(23, 59, 59, 999);
      return endOfDay <= endOfToday;
    },
    { message: 'End date cannot be in the future' },
  )
  .optional();

export const statementQuerySchema = z
  .object({ from: startDateField, to: endDateField })
  .refine(({ from, to }) => !from || !to || from < to, {
    message: 'Start date must be earlier than end date',
  });

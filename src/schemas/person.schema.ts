import { z } from 'zod';

export const personInsertSchema = z.object({
  name: z.string().min(1),
  document: z.string().min(1),
  birthDate: z.coerce.date(),
});

export const personSelectSchema = personInsertSchema.extend({
  personId: z.number().int(),
});

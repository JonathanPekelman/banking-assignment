import { z } from 'zod';

export const monetaryField = z.string().regex(/^\d+(\.\d{1,4})?$/);

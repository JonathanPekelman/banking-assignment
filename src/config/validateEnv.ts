import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.url(),
  APP_PORT: z.string().regex(/^\d+$/).transform(Number),
});

export const validateConfig = (
  env: Record<string, unknown>,
): Record<string, unknown> => {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    throw new Error(`Environment validation error: ${result.error.message}`);
  }

  return result.data;
};

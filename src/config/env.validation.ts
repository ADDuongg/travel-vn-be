import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().default(9001),

    DB_URI: z.string().min(1, 'DB_URI is required'),

    MONGO_TRANSACTIONS_ENABLED: z.preprocess((v) => {
      if (v === undefined || v === '') return undefined;
      if (v === false || v === 'false' || v === '0') return false;
      return v === true || v === 'true' || v === '1';
    }, z.boolean().optional()),

    JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(8, 'JWT_REFRESH_SECRET must be at least 8 characters'),
    JWT_REFRESH_TTL: z.string().default('7d'),
    JWT_ISSUER: z.string().default('vn-tours'),
    JWT_AUDIENCE: z.string().default('vn-tours-clients'),

    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    CORS_ORIGINS: z
      .string()
      .default(
        'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000,http://127.0.0.1:3000',
      ),

    LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
      .optional(),

    SERVICE_NAME: z.string().min(1).default('tours-api'),

    APP_VERSION: z.string().optional(),

    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().optional(),

    OTP_TTL_MINUTES: z.coerce.number().default(5),
    OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
    OTP_RESEND_WINDOW_SEC: z.coerce.number().default(60),

    OTP_ENTRY_MAX_ATTEMPTS: z.coerce.number().default(5),
    OTP_ENTRY_WINDOW_SEC: z.coerce.number().default(900),
    OTP_ENTRY_LOCKOUT_SEC: z.coerce.number().default(900),

    LOGIN_FAIL_MAX_ATTEMPTS: z.coerce.number().default(5),
    LOGIN_FAIL_WINDOW_SEC: z.coerce.number().default(900),
    LOGIN_FAIL_LOCKOUT_SEC: z.coerce.number().default(900),

    UNVERIFIED_USER_TTL_DAYS: z.coerce.number().min(1).default(7),

    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().default('noreply@example.com'),
    ADMIN_EMAIL: z.string().optional(),
    RESEND_FORCE_TO: z.string().optional(),

    OPENAI_API_KEY: z.string().optional(),
    OPENAI_BASE_URL: z.string().optional(),
    OPENAI_MODEL: z.string().optional(),

    LLM_PROVIDER: z.enum(['openai', 'ollama']).optional(),
    OLLAMA_BASE_URL: z.string().optional(),
    OLLAMA_MODEL: z.string().optional(),
    OLLAMA_API_KEY: z.string().optional(),

    FE_BASE_URL: z.string().url().default('http://localhost:5173'),

    ELASTICSEARCH_ENABLED: z
      .preprocess((v) => v === true || v === 'true' || v === '1', z.boolean())
      .default(false),

    ELASTICSEARCH_URL: z.string().optional(),

    ELASTICSEARCH_API_KEY: z.string().optional(),

    ELASTICSEARCH_USERNAME: z.string().optional(),

    ELASTICSEARCH_PASSWORD: z.string().optional(),

    ELASTICSEARCH_TOURS_INDEX: z.string().default('tours'),
  })
  .transform((data) => ({
    ...data,
    MONGO_TRANSACTIONS_ENABLED:
      data.MONGO_TRANSACTIONS_ENABLED ?? data.NODE_ENV === 'production',
  }))
  .superRefine((data, ctx) => {
    if (data.ELASTICSEARCH_ENABLED && !data.ELASTICSEARCH_URL?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'ELASTICSEARCH_URL is required when ELASTICSEARCH_ENABLED is true',
        path: ['ELASTICSEARCH_URL'],
      });
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  [${e.path.join('.')}] ${e.message}`)
      .join('\n');

    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}

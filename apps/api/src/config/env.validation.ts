import { z } from 'zod';

/**
 * Single source of truth for required environment variables. Fails fast at
 * boot with a readable error instead of surfacing undefined-env bugs deep
 * inside a request handler.
 */

/**
 * Defaults that exist only so `pnpm dev` runs with no setup. Named here
 * rather than inlined because production refuses to boot on them, and the
 * check must compare against the same literal the default hands out — two
 * copies of a secret string is how that check quietly stops matching.
 */
const DEV_DEFAULTS = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/amolie',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'dev-access-secret-change-me',
  JWT_REFRESH_SECRET: 'dev-refresh-secret-change-me',
} as const;

/** 256 bits of secret, expressed as characters — the floor for an HS256 key. */
const MIN_SECRET_LENGTH = 32;

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().default(DEV_DEFAULTS.DATABASE_URL),
  REDIS_URL: z.string().default(DEV_DEFAULTS.REDIS_URL),
  JWT_ACCESS_SECRET: z.string().default(DEV_DEFAULTS.JWT_ACCESS_SECRET),
  JWT_REFRESH_SECRET: z.string().default(DEV_DEFAULTS.JWT_REFRESH_SECRET),
});

/**
 * In production every one of these must be supplied explicitly.
 *
 * A signing secret that falls back to a literal committed to this repository
 * is not a weak secret, it is a public one: anyone could mint a token
 * claiming `platform_admin`, and `PermissionsGuard` reads that role straight
 * off the payload. The convenience default is exactly the kind of thing that
 * survives to production unnoticed, so the boot is what has to notice.
 *
 * `DATABASE_URL`/`REDIS_URL` are held to the same rule for a different
 * reason: silently pointing at localhost in production doesn't fail, it
 * connects to the wrong (or empty) database.
 */
export const envSchema = baseSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') return;

  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    if (env[key] === DEV_DEFAULTS[key]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} must be set in production — the development default is public`,
      });
    } else if (env[key].length < MIN_SECRET_LENGTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} must be at least ${MIN_SECRET_LENGTH} characters in production`,
      });
    }
  }

  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_REFRESH_SECRET'],
      message: 'JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET',
    });
  }

  for (const key of ['DATABASE_URL', 'REDIS_URL'] as const) {
    if (env[key] === DEV_DEFAULTS[key]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} must be set in production — the development default points at localhost`,
      });
    }
  }
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${parsed.error.toString()}`);
  }
  return parsed.data;
}

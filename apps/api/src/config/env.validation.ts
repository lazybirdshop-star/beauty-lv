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
  JWT_ACCESS_SECRET: 'dev-access-secret-change-me',
  JWT_REFRESH_SECRET: 'dev-refresh-secret-change-me',
} as const;

/** 256 bits of secret, expressed as characters — the floor for an HS256 key. */
const MIN_SECRET_LENGTH = 32;

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().default(DEV_DEFAULTS.DATABASE_URL),
  /**
   * Optional until something actually connects to it. Rate-limit counters and
   * the soft-hold on slots are the two callers that will need it (TASKS.md
   * A-5, B-11); until then a required-but-unread variable would only block a
   * deploy on a service that does not have to exist yet.
   */
  REDIS_URL: z.string().optional(),
  /**
   * Разбирает ли этот процесс очередь фоновых задач.
   *
   * Сегодня процесс один и разбирает он же; флаг существует ради двух
   * случаев. Первый — тесты и локальные скрипты, которым не нужен фоновый
   * опрос базы. Второй — день, когда воркер отделится в свою машину: тогда
   * API выключит его у себя, не меняя ни строчки кода.
   */
  JOBS_WORKER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  JWT_ACCESS_SECRET: z.string().default(DEV_DEFAULTS.JWT_ACCESS_SECRET),
  JWT_REFRESH_SECRET: z.string().default(DEV_DEFAULTS.JWT_REFRESH_SECRET),
  /**
   * Общий секрет BFF и API — тот самый «подписанный хоп», о котором говорит
   * `ClientThrottlerGuard`.
   *
   * Лимитер считает анонимный трафик по адресу из `X-Forwarded-For`, который
   * подставляет BFF. Заголовок ставит клиент, поэтому доверять ему можно
   * ровно настолько, насколько недостижим API напрямую — а он достижим:
   * `[http_service]` в fly.toml публикует машину в интернет. Без этого
   * секрета любой желающий сбрасывает свой счётчик, меняя строку в заголовке,
   * и лимиты на вход, регистрацию и письма восстановления перестают что-либо
   * значить.
   *
   * Обязателен в production и не имеет дефолта: значение по умолчанию здесь
   * было бы публичным — ровно как у ключей подписи ниже.
   */
  INTERNAL_PROXY_SECRET: z.string().optional(),
  /**
   * Object storage for page images. Optional rather than required so a
   * deploy without it still serves every other screen — but the API says so
   * at boot, and asking for an upload URL answers 503 instead of failing in
   * a way the master would read as her photo being wrong.
   *
   * The service key bypasses every row-level rule in the project, so it
   * belongs to the API alone and must never be handed to a browser.
   */
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_MEDIA_BUCKET: z.string().default('page-media'),
  /**
   * Почта. Как и хранилище — опционально: API поднимается без неё, письма
   * молча не уходят, а в логе при старте стоит предупреждение. Регистрация
   * не должна падать из-за недоступного почтового провайдера.
   */
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default('AMOLIE <onboarding@resend.dev>'),
  /**
   * Адрес сайта для ссылок в письмах. Без него ссылка активации указывала бы
   * в никуда, поэтому у него есть рабочий дефолт для локальной разработки.
   */
  APP_URL: z.string().url().default('http://localhost:3000'),
  /**
   * Ключи Web Push (VAPID, RFC 8292) — которыми API подписывается перед
   * push-сервисом браузера как отправитель, имеющий право писать на этот
   * endpoint. Пара генерируется один раз на весь продукт: сменить её значит
   * разом обесценить все подписки мастеров, потому что подписка выдана
   * устройством именно под этот открытый ключ.
   *
   * Опциональны по тому же правилу, что почта и хранилище: без них API
   * поднимается, кабинет честно показывает, что уведомления недоступны, а
   * запись создаётся как прежде. Приватный ключ не покидает сервер; открытый
   * отдаётся браузеру эндпоинтом — он и задуман публичным.
   */
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  /**
   * Контакт отправителя, который push-сервис вправе использовать, если с
   * нашими уведомлениями что-то не так (RFC 8292 §2.1). Обязан быть `mailto:`
   * или `https:` — Apple отвергает подписанный запрос с любым другим.
   */
  VAPID_SUBJECT: z
    .string()
    .refine((value) => value.startsWith('mailto:') || value.startsWith('https://'), {
      message: 'VAPID_SUBJECT must be a mailto: or https: URI',
    })
    .default('https://amolie.com'),
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
 * `DATABASE_URL` is held to the same rule for a different reason: silently
 * pointing at localhost in production doesn't fail, it connects to the wrong
 * (or empty) database.
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

  /*
   * Без него лимитер в проде оказывается перед выбором из двух плохих: верить
   * подставному заголовку или считать весь BFF-трафик одним клиентом, а это
   * общий счётчик на всех мастеров сразу. Поэтому загрузка останавливается
   * здесь, а не выясняется под нагрузкой.
   */
  if (!env.INTERNAL_PROXY_SECRET || env.INTERNAL_PROXY_SECRET.length < MIN_SECRET_LENGTH) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['INTERNAL_PROXY_SECRET'],
      message: `INTERNAL_PROXY_SECRET must be set in production and be at least ${MIN_SECRET_LENGTH} characters — the API is reachable directly, so X-Forwarded-For is only trustworthy when the hop is signed`,
    });
  }

  if (env.DATABASE_URL === DEV_DEFAULTS.DATABASE_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DATABASE_URL'],
      message:
        'DATABASE_URL must be set in production — the development default points at localhost',
    });
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

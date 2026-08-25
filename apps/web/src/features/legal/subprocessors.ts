/**
 * Подрядчики, обрабатывающие данные по поручению AMOLIE.
 *
 * Статья 28(2) GDPR требует держать этот список открытым и предупреждать о
 * его изменениях, поэтому он не декоративный: его печатает и политика
 * конфиденциальности, и раздел об обработке данных в условиях использования.
 * Здесь — только факты, не зависящие от языка; назначение подрядчика словами
 * даёт каждый перевод отдельно.
 *
 * Сверено с инфраструктурой на 2026-08-25: `fly.toml` (регион `arn` —
 * Стокгольм), `apps/api/src/config/env.validation.ts` (Resend),
 * `DEPLOYMENT.md` (Vercel, Supabase).
 */

export const SUBPROCESSOR_IDS = ['vercel', 'fly', 'supabase', 'resend'] as const;

export type SubprocessorId = (typeof SUBPROCESSOR_IDS)[number];

export interface Subprocessor {
  readonly id: SubprocessorId;
  /** Юридическое наименование подрядчика. */
  readonly name: string;
  /** Где физически лежат данные. Не юрисдикция компании, а регион хранения. */
  readonly hosting: string;
  readonly privacyUrl: string;
}

export const SUBPROCESSORS: readonly Subprocessor[] = [
  {
    id: 'vercel',
    name: 'Vercel Inc.',
    hosting: 'EU (fra1)',
    privacyUrl: 'https://vercel.com/legal/privacy-policy',
  },
  {
    id: 'fly',
    name: 'Fly.io, Inc.',
    hosting: 'EU (arn, Stockholm)',
    privacyUrl: 'https://fly.io/legal/privacy-policy/',
  },
  {
    id: 'supabase',
    name: 'Supabase, Inc.',
    hosting: 'EU (eu-north-1, Stockholm)',
    privacyUrl: 'https://supabase.com/privacy',
  },
  {
    id: 'resend',
    name: 'Resend, Inc.',
    hosting: 'EU / US',
    privacyUrl: 'https://resend.com/legal/privacy-policy',
  },
];

/**
 * Строки таблицы подрядчиков: факты отсюда, назначение — из перевода.
 * Порядок задаётся описью, а не словарём, чтобы переводы не разъезжались.
 */
export function subprocessorRows(purposes: Record<SubprocessorId, string>): string[][] {
  return SUBPROCESSORS.map((item) => [item.name, purposes[item.id], item.hosting, item.privacyUrl]);
}

import type { Messages } from '@/lib/i18n/messages';

import { AmolieHorizontal } from './wordmark';

/**
 * Подвал. Тихий край страницы, а не второй набор ссылок.
 *
 * Разделов у продукта пока нет — ни цен, ни блога, ни каталога, — и
 * изобретать их ради «полноценного футера» значило бы обещать страницы,
 * которых не существует.
 */
export function SiteFooter({ t }: { t: Messages['marketing'] }) {
  return (
    <footer className="mx-auto max-w-[1240px] px-6 pb-14 md:px-10">
      <div className="lp-rule h-px" />
      <div className="flex flex-col items-start gap-6 pt-9 sm:flex-row sm:items-center sm:justify-between">
        <AmolieHorizontal className="h-5 w-auto text-[var(--lp-ink-faint)]" />
        <p className="text-[12px] tracking-[0.02em] text-[var(--lp-ink-faint)]">
          {t.footerRights} · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}

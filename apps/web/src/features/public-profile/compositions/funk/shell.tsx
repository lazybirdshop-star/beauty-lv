'use client';

import { useT } from '@/lib/i18n';

import type { ProfileShellProps } from '../../contracts/sections';

import { MadeOnAmolie } from '../../shared/made-on-amolie';
import { OrgHeader } from './org-header';
import { OrgNav } from './org-nav';

/**
 * Каркас мира FUNK (`brutal.html`, `.page`): лист в чертёжной сетке.
 *
 * Сверху — бегущая строка: чернильная полоса с лаймовым моноширинным
 * капсом, единственное место мира, где что-то движется само по себе.
 * Содержимое ленты — не выдумка про студию, а то, что продукт про мастера
 * действительно знает: имя, город и открытая запись. Строка декоративна,
 * поэтому продублирована для бесшовной петли и скрыта от читалок целиком —
 * иначе те прочитали бы её дважды.
 *
 * Ширина 430px на телефоне и 1160px на развороте, с чернильными боками —
 * ровно как описано в `@media (min-width: 900px)` файла.
 */
export function Shell({ org, children }: ProfileShellProps) {
  const t = useT();

  const ticker = [org.name, org.city, t.publicPage.onlineBooking]
    .filter(Boolean)
    .join(' — ')
    .toUpperCase();

  return (
    <div className="funk-grid relative mx-auto min-h-[100dvh] w-full max-w-[430px] bg-bg pb-12 lg:max-w-[1160px] lg:border-x-[length:var(--rule-width)] lg:border-solid lg:border-ink">
      <div
        aria-hidden="true"
        className="relative z-[3] overflow-hidden border-b-[length:var(--rule-width)] border-solid border-ink bg-ink py-2.5"
      >
        <div className="funk-ticker-line flex w-max gap-7 whitespace-nowrap font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
          <span>{ticker} — </span>
          <span>{ticker} — </span>
        </div>
      </div>

      <div className="relative z-[2] flex min-w-0 flex-col">
        <OrgHeader org={org} />
        <OrgNav org={org} />
        <main className="min-w-0 flex-1">{children}</main>
        {/* Чертёжный мир подписывается чертёжно: моноширинный капс за
            сплошной чернильной линейкой той же толщины, что и края листа. */}
        <MadeOnAmolie className="mx-[18px] mb-2 mt-10 border-t-[length:var(--rule-width)] border-solid border-ink pt-4 text-center font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint lg:mx-10" />
      </div>
    </div>
  );
}

'use client';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { ContactsSectionProps } from '../../contracts/sections';

import { cascade, FOCUS_RING, HEADING_CLASS, STICKER_CLASS } from './ui';

/* Строка справочника — тот же блок, что и позиция прайса: мир не заводит
   для контактов второго объекта. */
const ROW_CLASS = `funk-block funk-press funk-lift anim-funk-pop flex items-center gap-3.5 px-[15px] py-4 ${FOCUS_RING}`;

/* Ключ строки — чернильная плашка с лаймовой надписью, посаженная под
   углом: `.c-key` файла. Короткое слово, потому что наклон длинного текста
   ломает строку. */
const KEY_CLASS =
  'shrink-0 -rotate-2 bg-ink px-2 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-accent';

/**
 * Контакты мира FUNK (`brutal.html`, вид `contacts`): адрес, телефон,
 * Instagram — три блока с ключом-плашкой слева.
 *
 * Каждый открывается: карта, звонок, профиль; поэтому каждый и есть ссылка
 * целиком. На развороте расходятся в две колонки.
 */
export function ContactsCard({ org }: ContactsSectionProps) {
  const t = useT();
  const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(org.address)}`;
  const telHref = `tel:${org.phone.replace(/\s+/g, '')}`;

  return (
    <section className="px-[18px] pt-2 lg:px-10">
      <div className="anim-funk-pop flex items-center justify-between gap-3 pb-3.5 pt-7">
        <h2 className={HEADING_CLASS}>{t.publicPage.contacts}</h2>
        <span className={cn(STICKER_CLASS, 'rotate-[1.5deg] bg-bg-raised')}>
          {t.publicPage.addressLabel}
        </span>
      </div>

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-2 lg:gap-4">
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer noopener"
          style={cascade(1)}
          className={cn(ROW_CLASS, 'lg:col-span-2')}
        >
          <span aria-hidden="true" className={KEY_CLASS}>
            {t.publicPage.addressLabel}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[15px] font-extrabold uppercase leading-snug text-ink">
              {[org.city, org.address].filter(Boolean).join(', ')}
            </span>
          </span>
          <span aria-hidden="true" className="shrink-0 font-mono font-bold text-ink">
            →
          </span>
        </a>

        <a href={telHref} style={cascade(2)} className={ROW_CLASS}>
          <span aria-hidden="true" className={KEY_CLASS}>
            {t.publicPage.contactLabel}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[15px] font-extrabold uppercase tabular-nums text-ink">
              {org.phone}
            </span>
          </span>
          <span aria-hidden="true" className="shrink-0 font-mono font-bold text-ink">
            →
          </span>
        </a>

        {org.instagram ? (
          <a
            href={`https://instagram.com/${org.instagram}`}
            target="_blank"
            rel="noreferrer noopener"
            style={cascade(3)}
            className={ROW_CLASS}
          >
            <span aria-hidden="true" className={KEY_CLASS}>
              Inst
            </span>
            <span className="min-w-0 flex-1">
              <span className="block break-all font-display text-[15px] font-extrabold uppercase text-ink">
                @{org.instagram}
              </span>
            </span>
            <span aria-hidden="true" className="shrink-0 font-mono font-bold text-ink">
              →
            </span>
          </a>
        ) : null}
      </div>
    </section>
  );
}

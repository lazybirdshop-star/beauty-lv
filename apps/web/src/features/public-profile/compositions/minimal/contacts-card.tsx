'use client';

import { InstagramLogo, MapPin, Phone } from '@phosphor-icons/react/dist/ssr';

import { useT } from '@/lib/i18n';

import type { ContactsSectionProps } from '../../contracts/sections';

/* Строка контакта — вся кликабельна; отклик — тихая заливка за 100ms,
   единственный hover-ответ этого мира рядом с укреплением края. */
const ROW_CLASS =
  'flex items-center gap-3.5 px-4 py-4 transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent';

/* Глиф без подложки: Phosphor Light 20px чернью — иконка помогает прочесть
   строку и не становится декором (§6 «Иконки»). */
const ICON_CLASS = 'shrink-0 text-ink';

/**
 * Контакты мира Minimal (§6): одна белая карточка 12px с волосяной рамкой,
 * строки делят волосяные линейки-разделители — документ, а не набор плашек.
 * Заливочные кружки иконок мягкого мира здесь не живут. Телефон табличными
 * цифрами — ровная колонка без моноширинного шрифта, которого мастер не
 * выбирала.
 */
export function ContactsCard({ org }: ContactsSectionProps) {
  const t = useT();
  const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(org.address)}`;
  const telHref = `tel:${org.phone.replace(/\s+/g, '')}`;

  return (
    <section className="pb-16 pt-12">
      <h2 className="mb-6 font-display text-[20px] leading-none tracking-[var(--display-tracking)] [font-weight:var(--display-weight)] text-ink">
        {t.publicPage.contacts}
      </h2>

      <div className="grid grid-cols-1 divide-y divide-border rounded-[var(--card-radius)] border border-border bg-bg-raised">
        <a href={mapsHref} target="_blank" rel="noreferrer" className={ROW_CLASS}>
          <MapPin size={20} weight="light" className={ICON_CLASS} aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold text-ink">{org.city}</span>
            <span className="block truncate text-sm text-ink-soft">{org.address}</span>
          </span>
        </a>

        <a href={telHref} className={ROW_CLASS}>
          <Phone size={20} weight="light" className={ICON_CLASS} aria-hidden="true" />
          <span className="text-[15px] font-semibold tabular-nums text-ink">{org.phone}</span>
        </a>

        {org.instagram ? (
          <a
            href={`https://instagram.com/${org.instagram}`}
            target="_blank"
            rel="noreferrer"
            className={ROW_CLASS}
          >
            <InstagramLogo size={20} weight="light" className={ICON_CLASS} aria-hidden="true" />
            <span className="text-[15px] font-semibold text-ink">@{org.instagram}</span>
          </a>
        ) : null}
      </div>
    </section>
  );
}

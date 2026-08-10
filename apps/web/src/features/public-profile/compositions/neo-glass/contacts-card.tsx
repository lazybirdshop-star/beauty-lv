'use client';

import { InstagramLogo, MapPin, Phone } from '@phosphor-icons/react';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { ContactsSectionProps } from '../../contracts/sections';
import { cascade, FOCUS_RING, LABEL_CLASS } from './ui';

/* Строка справочника — стеклянная карточка-объект: круглый глиф слева,
   метка и значение справа. Hover поднимает её на 2px и углубляет тень —
   тот же отклик, что у любой поверхности мира. */
const ROW_CLASS = `anim-neo-glass-materialize neo-glass-pane neo-glass-action neo-glass-lift flex items-center gap-3.5 rounded-[var(--card-radius)] p-4 ${FOCUS_RING}`;

/* Глиф в круглой утопленной нише: свет ложится изнутри края. */
const GLYPH_CLASS =
  'neo-glass-sunken flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent';

/**
 * Контакты мира Neo Glass (§9): три парящих объекта вместо справочной
 * полосы — адрес, телефон, Instagram. Каждый открывается: карта, звонок,
 * профиль; поэтому каждый и есть ссылка целиком, а не текст с крохотным
 * якорем внутри. Карточки материализуются каскадом 45ms, на sm расходятся
 * в две колонки.
 */
export function ContactsCard({ org }: ContactsSectionProps) {
  const t = useT();
  const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(org.address)}`;
  const telHref = `tel:${org.phone.replace(/\s+/g, '')}`;

  return (
    <section className="flex flex-col gap-3.5 pt-3.5">
      <h2 className="anim-neo-glass-materialize font-display text-[24px] leading-none tracking-[var(--display-tracking)] [font-weight:var(--display-weight)] text-ink">
        {t.publicPage.contacts}
      </h2>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer noopener"
          style={cascade(1)}
          className={cn(ROW_CLASS, 'sm:col-span-2')}
        >
          <span className={GLYPH_CLASS} aria-hidden="true">
            <MapPin size={18} weight="regular" />
          </span>
          <span className="min-w-0">
            <span className={cn('block', LABEL_CLASS)}>{t.publicPage.addressLabel}</span>
            <span className="mt-1 block text-[15px] leading-snug text-ink">
              {[org.city, org.address].filter(Boolean).join(', ')}
            </span>
          </span>
        </a>

        <a href={telHref} style={cascade(2)} className={ROW_CLASS}>
          <span className={GLYPH_CLASS} aria-hidden="true">
            <Phone size={18} weight="regular" />
          </span>
          <span className="min-w-0">
            <span className={cn('block', LABEL_CLASS)}>{t.publicPage.contactLabel}</span>
            <span className="mt-1 block text-[15px] tabular-nums text-ink">{org.phone}</span>
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
            <span className={GLYPH_CLASS} aria-hidden="true">
              <InstagramLogo size={18} weight="regular" />
            </span>
            <span className="min-w-0">
              <span className={cn('block', LABEL_CLASS)}>Instagram</span>
              <span className="mt-1 block break-all text-[15px] text-ink">@{org.instagram}</span>
            </span>
          </a>
        ) : null}
      </div>
    </section>
  );
}

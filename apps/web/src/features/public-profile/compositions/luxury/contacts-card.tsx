'use client';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { ContactsSectionProps } from '../../contracts/sections';
import { CAPTION_CLASS } from './ui';

/* Ссылка-строка справочника: чернь, hover уводит её в бронзу за 300ms. */
const LINK_CLASS =
  'luxury-action text-ink hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/**
 * Контакты мира Luxury («Bergs»): справочная полоса печатного разворота.
 * На телефоне — заголовок антиквой над чернильным швом и две колонки
 * «Адрес» и «Связь» под ним: капс-метки 10px, значения 13px с
 * интерлиньяжем 1.8, телефон табличными цифрами. С lg полоса раскрывается
 * в разворот: заголовок — левая страница за чернильным средником,
 * справочник — правая. Ни карточек, ни иконок — только типографика и
 * линейки; всё, что можно открыть (карта, звонок, Instagram), — ссылки.
 */
export function ContactsCard({ org }: ContactsSectionProps) {
  const t = useT();
  const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(org.address)}`;
  const telHref = `tel:${org.phone.replace(/\s+/g, '')}`;

  return (
    <section className="px-[18px] pb-10 pt-7 lg:grid lg:grid-cols-[2fr_3fr] lg:p-0">
      <div className="lg:border-r lg:border-border-strong lg:px-8 lg:py-9">
        <h2 className="border-b border-border-strong pb-3 font-display text-[28px] leading-none [font-weight:var(--display-weight)] text-ink lg:border-b-0 lg:pb-0 lg:text-[36px]">
          {t.publicPage.contacts}
        </h2>
      </div>

      <div className="mt-[18px] grid grid-cols-2 gap-3.5 text-[13px] leading-[1.8] lg:mt-0 lg:content-start lg:gap-8 lg:px-8 lg:py-9 lg:text-[14px]">
        <div className="min-w-0">
          <span className={cn('block', CAPTION_CLASS)}>{t.publicPage.addressLabel}</span>
          <a href={mapsHref} target="_blank" rel="noreferrer noopener" className={LINK_CLASS}>
            {org.city}
            {org.city && org.address ? ',' : ''}
            <br />
            {org.address}
          </a>
        </div>

        <div className="min-w-0">
          <span className={cn('block', CAPTION_CLASS)}>{t.publicPage.contactLabel}</span>
          <a href={telHref} className={cn(LINK_CLASS, 'tabular-nums')}>
            {org.phone}
          </a>
          {org.instagram ? (
            <>
              <br />
              <a
                href={`https://instagram.com/${org.instagram}`}
                target="_blank"
                rel="noreferrer noopener"
                className={cn(LINK_CLASS, 'break-all')}
              >
                @{org.instagram}
              </a>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

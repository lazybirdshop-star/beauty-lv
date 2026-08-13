'use client';

import { CaretRight, Clock, InstagramLogo, MapPin, Phone } from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { ContactsSectionProps } from '../../contracts/sections';

import { cascade, FOCUS_RING_INSET, HEADING_CLASS, HEADING_NOTE_CLASS } from './ui';

/**
 * Контакты мира MINIMAL (`minimal.html`, вид `contacts`): тот же
 * сгруппированный список, что и прайс, — мир не заводит для справочника
 * второго объекта.
 *
 * Иконка каждой строки лежит в скруглённом квадрате 38px, залитом
 * градиентом своего оттенка. Это единственное место мира, где красок
 * больше одной, и оно же единственное, где цвет не значит ничего, кроме
 * «это разные строки»: смысл несёт подпись, а не заливка.
 */
const ROW_CLASS = `min-press flex w-full items-center gap-3.5 px-5 py-[18px] text-left active:bg-bg-sunken ${FOCUS_RING_INSET}`;

function Row({
  icon: IconComponent,
  tint,
  title,
  meta,
  href,
  external,
}: {
  icon: Icon;
  tint: string;
  title: string;
  meta?: string;
  href?: string;
  external?: boolean;
}) {
  const body: ReactNode = (
    <>
      <span
        aria-hidden="true"
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl text-bg-raised"
        style={{ backgroundImage: tint }}
      >
        <IconComponent size={17} weight="regular" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold tracking-[-0.015em] text-ink">
          {title}
        </span>
        {meta ? (
          <span className="mt-0.5 block truncate text-[12.5px] tracking-[-0.01em] text-ink-soft">
            {meta}
          </span>
        ) : null}
      </span>

      {href ? (
        <span
          aria-hidden="true"
          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-bg-sunken text-ink-soft"
        >
          <CaretRight size={11} weight="bold" />
        </span>
      ) : null}
    </>
  );

  if (!href) return <div className={cn(ROW_CLASS, 'cursor-default')}>{body}</div>;

  return (
    <a
      href={href}
      className={cn(ROW_CLASS, 'cursor-pointer')}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
    >
      {body}
    </a>
  );
}

export function ContactsCard({ org }: ContactsSectionProps) {
  const t = useT();
  const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(org.address)}`;
  const telHref = `tel:${org.phone.replace(/\s+/g, '')}`;

  const rows = [
    {
      key: 'address',
      icon: MapPin,
      tint: 'linear-gradient(135deg, #64D2FF, #0A84FF)',
      title: [org.city, org.address].filter(Boolean).join(', '),
      meta: t.publicPage.addressLabel,
      href: mapsHref,
      external: true,
    },
    {
      key: 'phone',
      icon: Phone,
      tint: 'linear-gradient(135deg, #30D158, #1FA84A)',
      title: org.phone,
      meta: t.publicPage.contactLabel,
      href: telHref,
    },
    ...(org.instagram
      ? [
          {
            key: 'instagram',
            icon: InstagramLogo,
            tint: 'linear-gradient(135deg, #FF6482, #D30F45)',
            title: `@${org.instagram}`,
            meta: 'Instagram',
            href: `https://instagram.com/${org.instagram}`,
            external: true,
          },
        ]
      : []),
    ...(org.tagline
      ? [
          {
            key: 'about',
            icon: Clock,
            tint: 'linear-gradient(135deg, #AC8E68, #7D6238)',
            title: org.tagline,
            meta: undefined,
            href: undefined,
          },
        ]
      : []),
  ];

  return (
    <section className="px-[22px] pt-2 lg:px-10">
      <div className="anim-minimal-rise flex items-baseline justify-between gap-3 pb-3.5 pt-[30px]">
        <h2 className={HEADING_CLASS}>{t.publicPage.contacts}</h2>
        <span className={HEADING_NOTE_CLASS}>{org.name}</span>
      </div>

      <div className="min-card anim-minimal-rise flex flex-col overflow-hidden">
        {rows.map((row, index) => (
          <div
            key={row.key}
            style={cascade(index)}
            className="[&+div]:border-t [&+div]:border-border"
          >
            <Row
              icon={row.icon}
              tint={row.tint}
              title={row.title}
              meta={row.meta}
              href={row.href}
              external={row.external}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

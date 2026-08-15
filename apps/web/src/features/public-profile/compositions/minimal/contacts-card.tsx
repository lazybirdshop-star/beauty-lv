'use client';

import { CaretRight, InstagramLogo, MapPin, Phone } from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { ContactsSectionProps } from '../../contracts/sections';

import { cascade, FOCUS_RING_INSET, HEADING_CLASS } from './ui';

/**
 * Контакты мира MINIMAL (`minimal.html`, вид `contacts`): тот же
 * сгруппированный список, что и прайс, — мир не заводит для справочника
 * второго объекта.
 *
 * Иконка каждой строки лежит в скруглённом квадрате 38px, залитом
 * **акцентом мастера**.
 *
 * В файле здесь шесть готовых цветов — синий адрес, зелёный телефон,
 * розовый Instagram (`.c1`, `.c2`, `.c4`). У автора они складывались в
 * систему, потому что и сам мир был синим. У нас акцент — ручка Студии:
 * на странице с малиновым акцентом синяя булавка и зелёная трубка читались
 * не как система, а как чужие иконки, забытые от другого макета.
 *
 * Оттенок здесь ничего и не значил — смысл несёт подпись, а не заливка, —
 * поэтому терять нечего, а выиграна связность. Пара `--accent` /
 * `--accent-contrast` берётся у резолвера: её читаемость выводится и
 * проверяется (`theme.test.ts`), в отличие от вшитого белого на вшитом
 * цвете.
 */
const ROW_CLASS = `min-press flex w-full items-center gap-3.5 px-5 py-[18px] text-left active:bg-bg-sunken ${FOCUS_RING_INSET}`;

function Row({
  icon: IconComponent,
  title,
  meta,
  href,
  external,
}: {
  icon: Icon;
  title: string;
  meta?: string;
  href?: string;
  external?: boolean;
}) {
  const body: ReactNode = (
    <>
      <span
        aria-hidden="true"
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-accent text-accent-contrast"
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

  /*
   * Строка существует, только когда за ней есть чем открыться. Незаполненный
   * телефон давал строку с пустым заголовком и живой ссылкой `tel:` в
   * никуда — контрол, который выглядит нажимаемым и не делает ничего.
   *
   * Часов работы в этом ряду нет намеренно: у продукта таких данных не
   * существует, а таглайн под иконкой часов читался бы как «мы работаем
   * так-то» — подпись, обещающая не то, что показывает.
   */
  const address = [org.city, org.address].filter(Boolean).join(', ');

  const rows = [
    ...(address
      ? [
          {
            key: 'address',
            icon: MapPin,
            title: address,
            meta: t.publicPage.addressLabel,
            href: mapsHref,
            external: true,
          },
        ]
      : []),
    ...(org.phone
      ? [
          {
            key: 'phone',
            icon: Phone,
            title: org.phone,
            meta: t.publicPage.contactLabel,
            href: telHref,
            external: false,
          },
        ]
      : []),
    ...(org.instagram
      ? [
          {
            key: 'instagram',
            icon: InstagramLogo,
            title: `@${org.instagram}`,
            meta: 'Instagram',
            href: `https://instagram.com/${org.instagram}`,
            external: true,
          },
        ]
      : []),
  ];

  return (
    <section className="px-[22px] pt-2 lg:px-10">
      <div className="anim-minimal-rise flex items-baseline justify-between gap-3 pb-3.5 pt-[30px]">
        {/* Имени организации здесь нет: оно уже стоит вордмарком в шапке
            двумя блоками выше, и второй раз называет то же самое. */}
        <h2 className={HEADING_CLASS}>{t.publicPage.contacts}</h2>
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

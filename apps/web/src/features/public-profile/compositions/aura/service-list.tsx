'use client';

import { useMemo, useState } from 'react';

import { formatDuration, formatPrice } from '@/lib/format';
import { useT, type Messages, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { ServiceListSectionProps } from '../../contracts/sections';
import type { PublicService, PublicServiceCategory } from '../../engine/types';
import { ServiceDetailSheet } from '../../shared/service-detail-sheet';
import { ServiceThumb } from '../../shared/service-thumb';

import { BookingFlowSheet } from './booking-sheet';
import { cascade, FOCUS_RING, HEADING_CLASS, PRIMARY_BUTTON_CLASS } from './ui';

/**
 * Четыре светящиеся точки мира (`.d1`–`.d4` файла) — маркер строки, а не
 * носитель смысла: они раздаются по кругу и ничего не кодируют. Поэтому
 * `aria-hidden` и никакой легенды: цвет, который нечего расшифровывать, не
 * должен притворяться, что его расшифровка есть.
 */
const DOTS = ['#D9A0AE', '#B9A8E3', '#A8C8E8', '#A8D8BC'] as const;

/* Строка прайса — `.srv` файла: точка, имя с подписью, цена и стрелка. */
const ROW_CLASS = `aura-action flex w-full cursor-pointer items-center gap-3.5 px-5 py-[18px] text-left ${FOCUS_RING}`;

/**
 * Прайс мира AURA (`aura.html`, вид `services`): один стеклянный лист, внутри
 * — строки, разделённые волоском.
 *
 * Не карточки: лист целен, и разрезать его на плитки значило бы поменять
 * силуэт мира. На десктопе (≥lg) лист расходится в сетку стеклянных
 * карточек — ровно так же, как это описано в `@media (min-width: 900px)`
 * файла.
 *
 * Строка — кнопка целиком: деталь открывается листом, стрелка справа только
 * говорит, что там есть куда пойти. Секцию закрывает капсула «Записаться»:
 * запись доступна прямо из прайса.
 */
export function ServiceList({ org }: ServiceListSectionProps) {
  const t = useT();
  const locale = useLocale();
  const [openService, setOpenService] = useState<PublicService | null>(null);
  /* `'all'` — запись с нижней капсулы, без предвыбранной услуги. */
  const [bookingFor, setBookingFor] = useState<PublicService | 'all' | null>(null);
  const groups = useMemo(
    () => groupServices(org.services, org.serviceCategories, t),
    [org.services, org.serviceCategories, t],
  );

  let position = 0;

  return (
    <section className="pt-2">
      <div className="anim-aura-rise flex items-baseline justify-between px-0.5 pb-3 pt-8">
        <h2 className={HEADING_CLASS}>{t.publicPage.servicesShort}</h2>
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
          {t.publicPage.servicesAndPrices}
        </span>
      </div>

      {/* Подсказка стоит **перед** списком, а не после него: она объясняет,
          что со списком делать, и внизу её читал только тот, кто и так уже
          пролистал всё и разобрался сам. Мягкий и плакатный миры держали её
          наверху с самого начала — теперь так во всех. */}
      <p className="px-0.5 pb-5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
        {t.publicPage.serviceDetails}
      </p>

      {groups.map((group, groupIndex) => (
        <div key={group.id} className="flex flex-col">
          {group.name ? (
            <h3 className="px-0.5 pb-2.5 pt-5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
              {group.name}
            </h3>
          ) : null}

          <ul
            className="aura-veil aura-list anim-aura-rise overflow-hidden rounded-[var(--panel-radius)] lg:grid lg:grid-cols-2 lg:gap-3.5 lg:overflow-visible"
            style={cascade(groupIndex + 1)}
          >
            {group.services.map((service) => {
              const dot = DOTS[position++ % DOTS.length]!;
              return (
                <li
                  key={service.id}
                  className="min-w-0 border-border [&+li]:border-t lg:[&+li]:border-t-0"
                >
                  <button
                    type="button"
                    onClick={() => setOpenService(service)}
                    className={cn(
                      ROW_CLASS,
                      'aura-veil aura-list-item h-full lg:rounded-[var(--card-radius)]',
                    )}
                  >
                    {/* Снимок услуги, а если его нет — цветная точка мира.
                        Место одно, поэтому строки с фотографией и без держат
                        общую сетку. */}
                    <ServiceThumb
                      service={service}
                      className="h-12 w-12 rounded-[var(--card-radius)]"
                      fallback={
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: dot, boxShadow: `0 0 12px ${dot}` }}
                        />
                      }
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-medium tracking-[-0.01em] text-ink">
                        {service.name}
                      </span>
                      <span className="mt-1 block text-[11.5px] font-light text-ink-soft">
                        {formatDuration(service.durationMinutes, t.common)}
                      </span>
                    </span>

                    <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-ink">
                      {formatPrice(service.priceAmountMinorUnits, service.priceCurrency, locale)}
                    </span>
                    <span aria-hidden="true" className="shrink-0 font-light text-ink-faint">
                      →
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setBookingFor('all')}
        className={cn(PRIMARY_BUTTON_CLASS, 'mt-7 h-[52px] w-full')}
      >
        {t.publicPage.book}
      </button>

      <ServiceDetailSheet
        open={Boolean(openService)}
        onOpenChange={(next) => !next && setOpenService(null)}
        service={openService}
        onBook={() => {
          setBookingFor(openService);
          setOpenService(null);
        }}
      />

      {/* Keyed by the subject: the sheet derives its opening step from
          `initialServiceIds` in `useState`, which only runs on mount. Without a
          fresh instance it kept the route it was built with and asked for the
          service the visitor had just picked. */}
      <BookingFlowSheet
        key={bookingFor === 'all' ? 'all' : (bookingFor?.id ?? 'none')}
        open={Boolean(bookingFor)}
        onOpenChange={(next) => !next && setBookingFor(null)}
        org={org}
        preferredSlot={null}
        initialServiceIds={bookingFor && bookingFor !== 'all' ? [bookingFor.id] : undefined}
        /* Deliberately does nothing. Closing the sheet here dropped the
           visitor at the price list the instant the booking went through —
           the confirmation, the calendar file and the status link never got a
           chance to appear. The sheet closes when the person says it does. */
        onBooked={() => undefined}
      />
    </section>
  );
}

interface ServiceGroup {
  id: string;
  /** Empty when there is nothing to group by — the heading is then omitted entirely. */
  name: string;
  services: PublicService[];
}

/**
 * Groups the price list the way the master ordered her categories, with
 * anything uncategorised trailing under «Другие услуги».
 *
 * A service in a hidden category is not dropped — it lands in the trailing
 * group instead. Hiding a category is a statement about the grouping, not
 * about the work: silently deleting services from the public price list
 * would be a far bigger effect than the switch promises.
 */
function groupServices(
  services: PublicService[],
  categories: PublicServiceCategory[],
  t: Messages,
): ServiceGroup[] {
  if (categories.length === 0) {
    return services.length > 0 ? [{ id: 'all', name: '', services }] : [];
  }

  const groups: ServiceGroup[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    services: services.filter((service) => service.categoryId === category.id),
  }));

  const known = new Set(categories.map((category) => category.id));
  const rest = services.filter((service) => !service.categoryId || !known.has(service.categoryId));
  if (rest.length > 0) {
    groups.push({ id: 'rest', name: t.publicPage.otherServices, services: rest });
  }

  return groups.filter((group) => group.services.length > 0);
}

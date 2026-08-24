'use client';

import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useT, useLocale } from '@/lib/i18n';

import { formatDuration, groupForPicker } from '../../engine/booking-cart';
import type { PublicOrganization, PublicService, SlotDay } from '../../engine/types';
import { CAPTION_CLASS } from './ui';

/* Строка-опция макета «Bergs»: печатный прямоугольник в тихой линейке —
   имя 14px с длительностью капсом слева, цена антиквой 21px справа.
   «Выбрано» говорит рамка: бронзовый край и лёгкая бронзовая подложка;
   ни чекбоксов, ни кругов. Hover уводит край в чернь за 300ms. */
const ROW_CLASS =
  'luxury-action flex w-full cursor-pointer items-center justify-between gap-3.5 border px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

const ROW_IDLE_CLASS = 'border-border hover:border-border-strong';
const ROW_SELECTED_CLASS = 'border-accent bg-accent-soft';

function RowBody({ service }: { service: PublicService }) {
  const t = useT();
  const locale = useLocale();
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-ink">{service.name}</span>
        <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">
          {formatDuration(service.durationMinutes, t.publicPage)}
        </span>
      </span>
      <span className="shrink-0 whitespace-nowrap font-display text-[21px] tabular-nums [font-weight:var(--display-weight)] text-ink">
        {formatPrice(service.priceAmountMinorUnits, service.priceCurrency, locale)}
      </span>
    </>
  );
}

interface ServicesStepProps {
  org: PublicOrganization;
  selectedIds: string[];
  onToggle: (serviceId: string) => void;
}

/** Шаг 1 — каталог, сгруппированный так, как его собрал мастер. */
export function ServicesStep({ org, selectedIds, onToggle }: ServicesStepProps) {
  const groups = groupForPicker(org.services, org.serviceCategories);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-2">
          {group.name ? <h3 className={CAPTION_CLASS}>{group.name}</h3> : null}
          {group.services.map((service) => {
            const checked = selectedIds.includes(service.id);
            return (
              <button
                key={service.id}
                type="button"
                aria-pressed={checked}
                onClick={() => onToggle(service.id)}
                className={cn(ROW_CLASS, checked ? ROW_SELECTED_CLASS : ROW_IDLE_CLASS)}
              >
                <RowBody service={service} />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface AddonsStepProps {
  addons: PublicService[];
  selectedIds: string[];
  onToggle: (serviceId: string) => void;
}

/** Шаг 2 — что мастер советует добавить к только что сделанному выбору. */
export function AddonsStep({ addons, selectedIds, onToggle }: AddonsStepProps) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2">
      <p className="mb-1 text-sm text-ink-soft">{t.publicPage.suggestHint}</p>
      {addons.map((service) => {
        const checked = selectedIds.includes(service.id);
        return (
          <button
            key={service.id}
            type="button"
            aria-pressed={checked}
            onClick={() => onToggle(service.id)}
            className={cn(ROW_CLASS, checked ? ROW_SELECTED_CLASS : ROW_IDLE_CLASS)}
          >
            <RowBody service={service} />
          </button>
        );
      })}
    </div>
  );
}

interface TimeStepProps {
  days: SlotDay[];
  loading: boolean;
  activeDate: string | null;
  onPickDate: (date: string) => void;
  selectedSlotId: string | null;
  onPickSlot: (slotId: string) => void;
  durationMinutes: number;
}

/** Шаг 3 — только те старты, куда этот визит действительно помещается. */
export function TimeStep({
  days,
  loading,
  activeDate,
  onPickDate,
  selectedSlotId,
  onPickSlot,
  durationMinutes,
}: TimeStepProps) {
  const t = useT();
  if (loading) {
    return <p className="py-8 text-center text-sm text-ink-soft">{t.publicPage.pickingTime}</p>;
  }

  if (days.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-soft">
        {t.publicPage.noTimeFor} {formatDuration(durationMinutes, t.publicPage)}{' '}
        {t.publicPage.noTimeTail}
      </p>
    );
  }

  const day = days.find((item) => item.date === activeDate) ?? days[0]!;

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map((item) => (
          <button
            key={item.date}
            type="button"
            onClick={() => onPickDate(item.date)}
            aria-pressed={item.date === day.date}
            className={cn(
              /* Чипы дней — печатные прямоугольники; выбранный заполняется
                 бронзой за измеренные 240ms (тайминги несёт `luxury-cell`). */
              'luxury-cell flex min-h-11 shrink-0 cursor-pointer items-center border px-3.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              item.date === day.date
                ? 'border-accent bg-accent font-medium text-accent-contrast'
                : 'border-border text-ink-soft hover:border-border-strong hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {day.slots.map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => onPickSlot(slot.id)}
            aria-pressed={slot.id === selectedSlotId}
            className={cn(
              'luxury-cell cursor-pointer border px-4 py-[11px] text-[13px] tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              slot.id === selectedSlotId
                ? 'border-accent bg-accent font-medium text-accent-contrast'
                : 'border-border text-ink hover:border-border-strong',
            )}
          >
            {slot.time}
          </button>
        ))}
      </div>
    </div>
  );
}

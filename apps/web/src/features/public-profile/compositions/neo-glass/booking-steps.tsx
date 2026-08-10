'use client';

import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

import { formatDuration, groupForPicker } from '../../engine/booking-cart';
import type { PublicOrganization, PublicService, SlotDay } from '../../engine/types';
import { FOCUS_RING, LABEL_CLASS } from './ui';

/* Строка-опция — стеклянная карточка 20px: имя и длительность слева, цена
   дисплейной гарнитурой справа. «Выбрано» говорит материал: подложка
   `accent-soft` и бирюзовая кромка; ни чекбоксов, ни кругов — включённость
   читается тем, что объект набрал света. */
const ROW_CLASS = `neo-glass-action flex w-full cursor-pointer items-center justify-between gap-3.5 rounded-[var(--card-radius)] px-4 py-3.5 text-left ${FOCUS_RING}`;

const ROW_IDLE_CLASS = 'neo-glass-pane neo-glass-lift';
const ROW_SELECTED_CLASS = 'border border-accent bg-accent-soft';

/* Чип — та же непрерывная геометрия 12px, что у ячеек календаря: время и
   дата в этом мире одна система. */
const CHIP_CLASS = `neo-glass-action rounded-[var(--chip-radius)] text-[13px] tabular-nums ${FOCUS_RING}`;
const CHIP_SELECTED_CLASS =
  'bg-accent bg-[image:var(--surface-sheen)] font-semibold text-accent-contrast';

function RowBody({ service }: { service: PublicService }) {
  const t = useT();
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-ink">{service.name}</span>
        <span className={cn('mt-1.5 block', LABEL_CLASS)}>
          {formatDuration(service.durationMinutes, t.publicPage)}
        </span>
      </span>
      <span className="shrink-0 whitespace-nowrap font-display text-[17px] tabular-nums [font-weight:var(--display-weight)] text-ink">
        {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
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
          {group.name ? <h3 className={LABEL_CLASS}>{group.name}</h3> : null}
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

/**
 * Скелетон ожидания — спекулярный шиммер, стелющийся по стеклу (§9
 * «Движение», 1.6s): подбор времени занимает заметное время, и пустая
 * строка на этом месте выглядела бы обрывом, а не работой.
 */
function SlotsSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex flex-wrap gap-2">
        {[72, 88, 76, 84, 80, 92].map((width, index) => (
          <span
            key={index}
            style={{ width }}
            className="neo-glass-sunken relative h-11 overflow-hidden rounded-[var(--chip-radius)]"
          >
            <span className="anim-neo-glass-shimmer absolute inset-y-0 -left-1/3 w-1/3 bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--ink)_14%,transparent),transparent)]" />
          </span>
        ))}
      </div>
    </div>
  );
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
    return <SlotsSkeleton label={t.publicPage.pickingTime} />;
  }

  if (days.length === 0) {
    return (
      <p className="neo-glass-pane rounded-[var(--card-radius)] px-4 py-8 text-center text-sm text-ink-soft">
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
              CHIP_CLASS,
              'flex min-h-11 shrink-0 cursor-pointer items-center px-4',
              item.date === day.date
                ? CHIP_SELECTED_CLASS
                : 'neo-glass-pane neo-glass-lift text-ink-soft hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {day.slots.map((slot, index) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => onPickSlot(slot.id)}
            aria-pressed={slot.id === selectedSlotId}
            style={{ animationDelay: `${index * 30}ms` }}
            className={cn(
              CHIP_CLASS,
              'anim-neo-glass-pop cursor-pointer px-4 py-[11px]',
              slot.id === selectedSlotId
                ? CHIP_SELECTED_CLASS
                : 'neo-glass-pane neo-glass-lift text-ink',
            )}
          >
            {slot.time}
          </button>
        ))}
      </div>
    </div>
  );
}

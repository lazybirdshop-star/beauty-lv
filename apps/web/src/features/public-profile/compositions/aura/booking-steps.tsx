'use client';

import { formatPrice } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { formatDuration, groupForPicker } from '../../engine/booking-cart';
import type { PublicOrganization, PublicService, SlotDay } from '../../engine/types';

import { FOCUS_RING, LABEL_CLASS } from './ui';

/*
 * Услуга в шторке — капсула-чип (`.svc-chip` файла), а не строка списка.
 * Выбранная заливается чернью мира: включённость читается плотностью, а не
 * галочкой — чекбоксов в этом мире нет вовсе.
 */
const CHIP_CLASS = `aura-action cursor-pointer rounded-[var(--chip-radius)] px-[17px] py-3 text-[12.5px] font-medium ${FOCUS_RING}`;
const CHIP_IDLE_CLASS = 'aura-veil text-ink';
const CHIP_SELECTED_CLASS = 'bg-ink text-bg';

function chipLabel(service: PublicService): string {
  return `${service.name} · ${formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}`;
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
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-2.5">
          {group.name ? <h3 className={LABEL_CLASS}>{group.name}</h3> : null}
          <div className="flex flex-wrap gap-2">
            {group.services.map((service) => {
              const checked = selectedIds.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  aria-pressed={checked}
                  onClick={() => onToggle(service.id)}
                  className={cn(CHIP_CLASS, checked ? CHIP_SELECTED_CLASS : CHIP_IDLE_CLASS)}
                >
                  {chipLabel(service)}
                </button>
              );
            })}
          </div>
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
    <div className="flex flex-col gap-3">
      <p className="text-sm font-light text-ink-soft">{t.publicPage.suggestHint}</p>
      <div className="flex flex-wrap gap-2">
        {addons.map((service) => {
          const checked = selectedIds.includes(service.id);
          return (
            <button
              key={service.id}
              type="button"
              aria-pressed={checked}
              onClick={() => onToggle(service.id)}
              className={cn(CHIP_CLASS, checked ? CHIP_SELECTED_CLASS : CHIP_IDLE_CLASS)}
            >
              {chipLabel(service)}
            </button>
          );
        })}
      </div>
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
 * Скелетон ожидания — стеклянные капсулы, по которым стелется блик: подбор
 * времени занимает заметное время, и пустая строка на этом месте выглядела
 * бы обрывом, а не работой.
 */
function SlotsSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="grid grid-cols-3 gap-[9px]">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <span
            key={index}
            className="aura-veil h-[46px] rounded-[var(--chip-radius)] opacity-60"
          />
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
      <p className="aura-veil rounded-[var(--card-radius)] px-4 py-8 text-center text-sm text-ink-soft">
        {t.publicPage.noTimeFor} {formatDuration(durationMinutes, t.publicPage)}{' '}
        {t.publicPage.noTimeTail}
      </p>
    );
  }

  const day = days.find((item) => item.date === activeDate) ?? days[0]!;

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((item) => (
          <button
            key={item.date}
            type="button"
            onClick={() => onPickDate(item.date)}
            aria-pressed={item.date === day.date}
            className={cn(
              CHIP_CLASS,
              'flex min-h-11 shrink-0 items-center whitespace-nowrap',
              item.date === day.date
                ? CHIP_SELECTED_CLASS
                : cn(CHIP_IDLE_CLASS, 'text-ink-soft hover:text-ink'),
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-[9px]">
        {day.slots.map((slot, index) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => onPickSlot(slot.id)}
            aria-pressed={slot.id === selectedSlotId}
            style={{ animationDelay: `${index * 30}ms` }}
            className={cn(
              'anim-aura-pop aura-action h-[46px] cursor-pointer rounded-[var(--chip-radius)] text-[13px] font-medium tabular-nums',
              FOCUS_RING,
              slot.id === selectedSlotId ? CHIP_SELECTED_CLASS : cn(CHIP_IDLE_CLASS),
            )}
          >
            {slot.time}
          </button>
        ))}
      </div>
    </div>
  );
}

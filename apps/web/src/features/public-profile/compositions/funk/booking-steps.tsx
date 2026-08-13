'use client';

import { formatPrice } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { formatDuration, groupForPicker } from '../../engine/booking-cart';
import type { PublicOrganization, PublicService, SlotDay } from '../../engine/types';

import { FOCUS_RING, LABEL_CLASS } from './ui';

/*
 * Услуга — чип-блок (`.svc-chip` файла): белый с чернильным контуром,
 * выбранный залит чернью с лаймовой надписью и розовой тенью. Ни галочек,
 * ни чекбоксов: включённость читается тем, что объект перевернулся в
 * негатив.
 */
const CHIP_CLASS = `funk-press cursor-pointer border-[length:var(--rule-width)] border-solid border-ink px-3.5 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] ${FOCUS_RING}`;
const CHIP_IDLE_CLASS = 'bg-bg-raised text-ink shadow-[3px_3px_0_var(--ink)]';
const CHIP_SELECTED_CLASS = 'bg-ink text-accent shadow-[3px_3px_0_var(--accent-to,var(--accent))]';

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
          {group.name ? <h3 className={LABEL_CLASS}>{`// ${group.name}`}</h3> : null}
          <div className="flex flex-wrap gap-2.5">
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
      <p className="font-mono text-[11.5px] leading-relaxed text-ink-soft">
        {t.publicPage.suggestHint}
      </p>
      <div className="flex flex-wrap gap-2.5">
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

/** Ожидание — пунктирные пустые блоки: работа идёт, места размечены. */
function SlotsSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="grid grid-cols-3 gap-[9px]">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <span key={index} className="h-[46px] border-2 border-dashed border-ink/40" />
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
  if (loading) return <SlotsSkeleton label={t.publicPage.pickingTime} />;

  if (days.length === 0) {
    return (
      <p className="funk-block px-4 py-8 text-center font-mono text-[11.5px] text-ink-soft">
        {t.publicPage.noTimeFor} {formatDuration(durationMinutes, t.publicPage)}{' '}
        {t.publicPage.noTimeTail}
      </p>
    );
  }

  const day = days.find((item) => item.date === activeDate) ?? days[0]!;

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-0.5 flex gap-2.5 overflow-x-auto px-0.5 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((item) => (
          <button
            key={item.date}
            type="button"
            onClick={() => onPickDate(item.date)}
            aria-pressed={item.date === day.date}
            className={cn(
              CHIP_CLASS,
              'flex min-h-11 shrink-0 items-center whitespace-nowrap',
              item.date === day.date ? CHIP_SELECTED_CLASS : CHIP_IDLE_CLASS,
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-[9px]">
        {day.slots.map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => onPickSlot(slot.id)}
            aria-pressed={slot.id === selectedSlotId}
            className={cn(
              'funk-press h-[46px] cursor-pointer border-[length:var(--rule-width)] border-solid border-ink font-mono text-xs font-bold tabular-nums',
              FOCUS_RING,
              slot.id === selectedSlotId ? CHIP_SELECTED_CLASS : CHIP_IDLE_CLASS,
            )}
          >
            {slot.time}
          </button>
        ))}
      </div>
    </div>
  );
}

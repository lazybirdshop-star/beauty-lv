'use client';

import { Check, Plus } from '@phosphor-icons/react';

import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

import { formatDuration, groupForPicker } from '../../engine/booking-cart';
import type { PublicOrganization, PublicService, SlotDay } from '../../engine/types';

/* Строка выбора: белая карточка 12px с волосяной линейкой (§6 «Карточки»).
   Hover укрепляет край за 100ms — отклик цветом, не сдвигом; выбранная
   держит подложку `accent-soft` — «выбрано» в словаре мира. */
const ROW_CLASS =
  'flex w-full cursor-pointer items-center gap-3.5 rounded-[var(--card-radius)] border border-border bg-bg-raised px-4 py-3.5 text-left transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] hover:border-border-strong';

/* Метка группы — подпись-метка 11px, единственное место, где этот мир
   позволяет себе капс (§6 «Типографика»). */
const GROUP_LABEL_CLASS = 'text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint';

function Meta({ service }: { service: PublicService }) {
  const t = useT();
  return (
    <span className="mt-0.5 block truncate text-[13px] tabular-nums text-ink-soft">
      {formatDuration(service.durationMinutes, t.publicPage)} ·{' '}
      {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
    </span>
  );
}

/**
 * Отметка выбора — квадрат с малым радиусом, не круг: пилюли и круги —
 * чужой словарь (§6 «Форма»). Состояние, а не кнопка: зона нажатия — вся
 * строка. Невыбранная несёт край `border-strong` (измеренные 3.1:1 — норма
 * контраста контролов).
 */
function Tick({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)]',
        checked ? 'border-accent bg-accent text-accent-contrast' : 'border-border-strong',
      )}
    >
      {checked ? <Check size={12} weight="bold" /> : null}
    </span>
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
        <div key={group.id} className="flex flex-col gap-2.5">
          {group.name ? <h3 className={GROUP_LABEL_CLASS}>{group.name}</h3> : null}
          {group.services.map((service) => {
            const checked = selectedIds.includes(service.id);
            return (
              <button
                key={service.id}
                type="button"
                aria-pressed={checked}
                onClick={() => onToggle(service.id)}
                className={cn(ROW_CLASS, checked && 'border-border-strong bg-accent-soft')}
              >
                <Tick checked={checked} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-ink">
                    {service.name}
                  </span>
                  <Meta service={service} />
                </span>
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
    <div className="flex flex-col gap-2.5">
      <p className="mb-1 text-sm text-ink-soft">{t.publicPage.suggestHint}</p>
      {addons.map((service) => {
        const checked = selectedIds.includes(service.id);
        return (
          <button
            key={service.id}
            type="button"
            aria-pressed={checked}
            onClick={() => onToggle(service.id)}
            className={cn(ROW_CLASS, checked && 'border-border-strong bg-accent-soft')}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)]',
                checked ? 'bg-accent text-accent-contrast' : 'bg-bg-sunken text-ink-soft',
              )}
            >
              {checked ? <Check size={12} weight="bold" /> : <Plus size={12} weight="bold" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-ink">
                {service.name}
              </span>
              <Meta service={service} />
            </span>
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
              'flex min-h-11 shrink-0 cursor-pointer items-center rounded-[var(--chip-radius)] border px-3.5 text-sm font-medium transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              item.date === day.date
                ? 'border-transparent bg-accent font-semibold text-accent-contrast'
                : 'border-border text-ink-soft hover:border-border-strong hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {day.slots.map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => onPickSlot(slot.id)}
            aria-pressed={slot.id === selectedSlotId}
            className={cn(
              'flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--chip-radius)] border text-sm font-medium tabular-nums transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              slot.id === selectedSlotId
                ? 'border-transparent bg-accent font-semibold text-accent-contrast'
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

'use client';

import { Check, Plus } from '@phosphor-icons/react';

import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

import { formatDuration, groupForPicker } from '../booking-cart';
import type { PublicOrganization, PublicService, PublishedSlot } from '../types';

// Ruled rows, not tinted pills: the sheet is the same poster surface as the
// page behind it, and a rounded tinted tile is the template's furniture.
const ROW_CLASS =
  'press card flex w-full items-center gap-3 px-3.5 py-3 text-left hover:border-border-strong';

function Meta({ service }: { service: PublicService }) {
  return (
    <span className="mt-0.5 block truncate text-[13px] text-ink-soft">
      {formatDuration(service.durationMinutes)} ·{' '}
      {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
    </span>
  );
}

/** A tick that is a state, not a button: the whole row is the hit target. */
function Tick({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center border-2 transition-colors',
        checked ? 'border-accent bg-accent text-accent-contrast' : 'border-border-strong',
      )}
    >
      {checked ? <Check size={14} weight="bold" /> : null}
    </span>
  );
}

interface ServicesStepProps {
  org: PublicOrganization;
  selectedIds: string[];
  onToggle: (serviceId: string) => void;
}

/** Step 1 — the catalogue, grouped the way the master arranged it. */
export function ServicesStep({ org, selectedIds, onToggle }: ServicesStepProps) {
  const groups = groupForPicker(org.services, org.serviceCategories);

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-2">
          {group.name ? (
            <h3 className="font-display text-[16px] leading-none text-ink">{group.name}</h3>
          ) : null}
          {group.services.map((service) => {
            const checked = selectedIds.includes(service.id);
            return (
              <button
                key={service.id}
                type="button"
                aria-pressed={checked}
                onClick={() => onToggle(service.id)}
                className={cn(ROW_CLASS, checked && 'border-accent bg-accent-soft')}
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

/** Step 2 — what the master suggests alongside the choice just made. */
export function AddonsStep({ addons, selectedIds, onToggle }: AddonsStepProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="mb-1 text-sm text-ink-soft">
        Мастер советует добавить к выбранному. Можно пропустить.
      </p>
      {addons.map((service) => {
        const checked = selectedIds.includes(service.id);
        return (
          <button
            key={service.id}
            type="button"
            aria-pressed={checked}
            onClick={() => onToggle(service.id)}
            className={cn(ROW_CLASS, checked && 'bg-accent-soft')}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center transition-colors',
                checked ? 'bg-accent text-accent-contrast' : 'bg-bg-raised text-ink-soft',
              )}
            >
              {checked ? <Check size={14} weight="bold" /> : <Plus size={14} weight="bold" />}
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

export interface SlotDay {
  date: string;
  label: string;
  slots: PublishedSlot[];
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

/** Step 3 — only the starts where this particular visit fits. */
export function TimeStep({
  days,
  loading,
  activeDate,
  onPickDate,
  selectedSlotId,
  onPickSlot,
  durationMinutes,
}: TimeStepProps) {
  if (loading) {
    return <p className="py-8 text-center text-sm text-ink-soft">Подбираем свободное время…</p>;
  }

  if (days.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-soft">
        На выбранные услуги нужно {formatDuration(durationMinutes)} подряд — столько свободного
        времени сейчас нет. Уберите что-нибудь из записи или свяжитесь с мастером напрямую.
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
              'press field flex min-h-11 shrink-0 items-center px-3.5 text-sm font-semibold transition-colors',
              item.date === day.date
                ? 'border-accent bg-accent text-accent-contrast'
                : 'border-border text-ink-soft hover:border-border-strong',
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
              'press field flex min-h-11 items-center justify-center text-sm font-semibold tabular-nums transition-colors',
              slot.id === selectedSlotId
                ? 'border-accent bg-accent text-accent-contrast'
                : 'border-border-strong text-ink hover:border-accent hover:text-accent',
            )}
          >
            {slot.time}
          </button>
        ))}
      </div>
    </div>
  );
}

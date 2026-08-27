'use client';

import { formatDuration, formatPrice } from '@/lib/format';
import { useT, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { groupForPicker } from '../../engine/booking-cart';
import type { PublicOrganization, PublicService, SlotDay } from '../../engine/types';
import { ServiceThumb } from '../../shared/service-thumb';

import { FOCUS_RING, LABEL_CLASS } from './ui';

/*
 * Чип-капсула осталась за датой и временем: там выбирают одно короткое
 * значение из ряда. Услуга из неё переехала в строку — см. ниже.
 */
const CHIP_CLASS = `min-press cursor-pointer rounded-[var(--chip-radius)] px-4 py-2.5 text-[13px] font-semibold tracking-[-0.015em] ${FOCUS_RING}`;
const CHIP_IDLE_CLASS = 'bg-bg-sunken text-ink';
const CHIP_SELECTED_CLASS = 'bg-ink text-bg-raised';

/*
 * Услуга в шторке — строка, а не чип.
 *
 * У чипа одно место под текст: имя и цена сливались через точку,
 * длительность не помещалась, фотографии услуги было некуда встать. Строка
 * даёт три места и приводит мир к тому, что мягкий, плакатный и роскошный
 * делают с самого начала. Ни галочек, ни чекбоксов по-прежнему нет:
 * включённость читается тем, что строка перевернулась в негатив, а
 * второстепенный текст внутри приглушён прозрачностью, а не токеном цвета —
 * на залитой строке `text-ink-soft` был бы чернью по черни.
 */
const ROW_CLASS = `min-press flex w-full cursor-pointer items-center gap-3.5 rounded-[var(--chip-radius)] px-4 py-3 text-left ${FOCUS_RING}`;
const ROW_IDLE_CLASS = 'bg-bg-sunken text-ink';
const ROW_SELECTED_CLASS = 'bg-ink text-bg-raised';
const THUMB_CLASS = 'h-11 w-11 rounded-[var(--chip-radius)]';

function ServiceRow({
  service,
  checked,
  onToggle,
}: {
  service: PublicService;
  checked: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onToggle}
      className={cn(ROW_CLASS, checked ? ROW_SELECTED_CLASS : ROW_IDLE_CLASS)}
    >
      <ServiceThumb service={service} className={THUMB_CLASS} />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold tracking-[-0.015em]">{service.name}</span>
        <span className="mt-0.5 block text-[12px] tracking-[-0.01em] opacity-70">
          {formatDuration(service.durationMinutes, t.common)}
        </span>
      </span>
      <span className="shrink-0 whitespace-nowrap text-[14px] font-bold tabular-nums">
        {formatPrice(service.priceAmountMinorUnits, service.priceCurrency, locale)}
      </span>
    </button>
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
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-2.5">
          {group.name ? <h3 className={LABEL_CLASS}>{group.name}</h3> : null}
          <div className="flex flex-col gap-2">
            {group.services.map((service) => (
              <ServiceRow
                key={service.id}
                service={service}
                checked={selectedIds.includes(service.id)}
                onToggle={() => onToggle(service.id)}
              />
            ))}
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
      <p className="text-[13px] leading-relaxed tracking-[-0.01em] text-ink-soft">
        {t.publicPage.suggestHint}
      </p>
      <div className="flex flex-col gap-2">
        {addons.map((service) => (
          <ServiceRow
            key={service.id}
            service={service}
            checked={selectedIds.includes(service.id)}
            onToggle={() => onToggle(service.id)}
          />
        ))}
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

/** Ожидание — пустые капсулы подложки: работа идёт, места размечены. */
function SlotsSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="grid grid-cols-3 gap-[9px]">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <span
            key={index}
            className="h-11 animate-pulse rounded-[var(--chip-radius)] bg-bg-sunken"
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
  if (loading) return <SlotsSkeleton label={t.publicPage.pickingTime} />;

  if (days.length === 0) {
    return (
      <p className="min-card px-4 py-8 text-center text-[13px] text-ink-soft">
        {t.publicPage.noTimeFor} {formatDuration(durationMinutes, t.common)}{' '}
        {t.publicPage.noTimeTail}
      </p>
    );
  }

  const day = days.find((item) => item.date === activeDate) ?? days[0]!;

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              'min-press h-11 cursor-pointer rounded-[var(--chip-radius)] text-sm font-semibold tracking-[-0.02em]',
              FOCUS_RING,
              slot.id === selectedSlotId
                ? 'bg-[var(--action-bg)] text-[var(--action-ink)] shadow-[0_10px_22px_-8px_color-mix(in_srgb,var(--accent)_55%,transparent)]'
                : CHIP_IDLE_CLASS,
            )}
          >
            {slot.time}
          </button>
        ))}
      </div>
    </div>
  );
}

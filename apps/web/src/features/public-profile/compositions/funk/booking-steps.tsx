'use client';

import { formatDuration, formatPrice } from '@/lib/format';
import { useT, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { groupForPicker } from '../../engine/booking-cart';
import type { PublicOrganization, PublicService, SlotDay } from '../../engine/types';
import { ServiceThumb } from '../../shared/service-thumb';

import { FOCUS_RING, LABEL_CLASS } from './ui';

/*
 * Чип-блок остался за датой и временем: там выбирают одно короткое значение
 * из ряда. Услуга из него переехала в строку — см. ниже.
 */
const CHIP_CLASS = `funk-press cursor-pointer border-[length:var(--rule-width)] border-solid border-ink px-3.5 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] ${FOCUS_RING}`;
const CHIP_IDLE_CLASS = 'bg-bg-raised text-ink shadow-[3px_3px_0_var(--ink)]';
const CHIP_SELECTED_CLASS = 'bg-ink text-accent shadow-[3px_3px_0_var(--accent-to,var(--accent))]';

/*
 * Услуга в шторке — строка, а не чип-блок.
 *
 * У чипа одно место под текст: имя и цена сливались через точку,
 * длительность не помещалась, фотографии услуги было некуда встать. Строка
 * даёт три места и приводит мир к тому, что мягкий, плакатный и роскошный
 * делают с самого начала. Ни галочек, ни чекбоксов по-прежнему нет:
 * включённость читается тем, что блок перевернулся в негатив. Снимок
 * обрезан по прямому углу и обведён тем же контуром, что и сам блок, — в
 * этом мире скруглений не бывает.
 */
const ROW_CLASS = `funk-press flex w-full cursor-pointer items-center gap-3 border-[length:var(--rule-width)] border-solid border-ink px-3.5 py-3 text-left font-mono uppercase ${FOCUS_RING}`;
const ROW_IDLE_CLASS = 'bg-bg-raised text-ink shadow-[3px_3px_0_var(--ink)]';
const ROW_SELECTED_CLASS = 'bg-ink text-accent shadow-[3px_3px_0_var(--accent-to,var(--accent))]';
const THUMB_CLASS = 'h-11 w-11 border-[length:var(--rule-width)] border-solid border-ink';

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
        <span className="block text-[10.5px] font-bold tracking-[0.06em]">{service.name}</span>
        <span className="mt-1 block text-[9.5px] font-bold tracking-[0.06em] opacity-70">
          {formatDuration(service.durationMinutes, t.common)}
        </span>
      </span>
      <span className="shrink-0 whitespace-nowrap text-[10.5px] font-bold tabular-nums tracking-[0.06em]">
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
          {group.name ? <h3 className={LABEL_CLASS}>{`// ${group.name}`}</h3> : null}
          <div className="flex flex-col gap-2.5">
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
      <p className="font-mono text-[11.5px] leading-relaxed text-ink-soft">
        {t.publicPage.suggestHint}
      </p>
      <div className="flex flex-col gap-2.5">
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
        {t.publicPage.noTimeFor} {formatDuration(durationMinutes, t.common)}{' '}
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

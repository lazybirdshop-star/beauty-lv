'use client';

import { formatPrice } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { formatDuration, groupForPicker } from '../../engine/booking-cart';
import type { PublicOrganization, PublicService, SlotDay } from '../../engine/types';
import { ServiceThumb } from '../../shared/service-thumb';

import { FOCUS_RING, LABEL_CLASS } from './ui';

/*
 * Капсула-чип (`.svc-chip` файла) осталась за датой и временем: там выбирают
 * одно короткое значение из ряда, и ряд капсул — ровно та форма. Услуга из неё
 * переехала в строку — см. ниже.
 */
const CHIP_CLASS = `aura-action cursor-pointer rounded-[var(--chip-radius)] px-[17px] py-3 text-[12.5px] font-medium ${FOCUS_RING}`;
const CHIP_IDLE_CLASS = 'aura-veil text-ink';
const CHIP_SELECTED_CLASS = 'bg-ink text-bg';

/*
 * Услуга в шторке — строка, а не капсула-чип.
 *
 * Чипом она была потому, что так устроен `aura.html`, но у чипа одно место
 * под текст: имя и цена сливались в одну строчку через точку, длительность не
 * помещалась вовсе, а фотографии услуги было некуда встать. Строка даёт три
 * места — снимок, имя с длительностью, цена справа, — и приводит мир к тому,
 * что мягкий, плакатный и роскошный делают с самого начала.
 *
 * Выбранная по-прежнему заливается чернью мира: включённость читается
 * плотностью, а не галочкой — чекбоксов в этом мире нет вовсе. По той же
 * причине второстепенный текст внутри строки приглушён прозрачностью, а не
 * токеном цвета: на залитой строке `text-ink-soft` был бы чернью по черни.
 */
const ROW_CLASS = `aura-action flex w-full cursor-pointer items-center gap-3 rounded-[var(--chip-radius)] px-4 py-3 text-left ${FOCUS_RING}`;
const ROW_IDLE_CLASS = 'aura-veil text-ink';
const ROW_SELECTED_CLASS = 'bg-ink text-bg';
/** Снимок услуги — мягкий квадрат под скругление мира. */
const THUMB_CLASS = 'h-11 w-11 rounded-[var(--chip-radius)]';

function ServiceRow({
  service,
  checked,
  onToggle,
  lead,
}: {
  service: PublicService;
  checked: boolean;
  onToggle: () => void;
  /** Знак вместо снимка, когда фотографии нет. */
  lead?: React.ReactNode;
}) {
  const t = useT();
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onToggle}
      className={cn(ROW_CLASS, checked ? ROW_SELECTED_CLASS : ROW_IDLE_CLASS)}
    >
      <ServiceThumb service={service} className={THUMB_CLASS} fallback={lead} />
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-medium">{service.name}</span>
        <span className="mt-0.5 block text-[11.5px] font-light opacity-70">
          {formatDuration(service.durationMinutes, t.publicPage)}
        </span>
      </span>
      <span className="shrink-0 whitespace-nowrap text-[13px] font-semibold tabular-nums">
        {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
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
      <p className="text-sm font-light text-ink-soft">{t.publicPage.suggestHint}</p>
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

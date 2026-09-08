'use client';

/**
 * Шторка «Рабочее время» — место из артборда `Availability.dc.html`.
 *
 * Внутри — то, чем продукт на самом деле объявляет рабочее время: открыть
 * период окон, добавить одно окно, снять период. Недельной таблицы часов из
 * макета здесь нет и не может быть: у продукта нет такой модели данных —
 * расписание хранится опубликованными окнами, а не парами «с — до» по дням
 * недели. Нарисовать таблицу, которая никуда не пишется, значило бы обещать
 * настройку, которой нет; недельные часы — отдельная работа по API.
 *
 * Место в интерфейсе при этом занято тем же, чем в макете: кнопка «Рабочее
 * время» на панели календаря открывает эту шторку.
 */
import { SideSheet } from '@/features/dashboard-shell/components/side-sheet';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { useT } from '@/lib/i18n';

import { PublishSlotForm } from './publish-slot-form';

export function AvailabilitySheet({
  open,
  onOpenChange,
  onPublish,
  publishing,
  onOpenPeriod,
  onClearPeriod,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: (startsAt: string) => Promise<void>;
  publishing: boolean;
  onOpenPeriod: () => void;
  onClearPeriod: () => void;
  /** День и час клетки, по которой нажали в календаре. */
  initial?: { date: string; time: string };
}) {
  const t = useT();

  return (
    <SideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.schedule.availability}
      subtitle={t.schedule.availabilityHint}
      closeLabel={t.common.close}
    >
      {/* Период — первым: расписание открывают неделями, а поштучно
          дописывают потом. */}
      <div className="col" style={{ gap: 8 }}>
        <span className="t-label">{t.schedule.periodTitle}</span>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={onOpenPeriod}>
            <Icon name="calendarPlus" className="ico-18" />
            <span>{t.schedule.period}</span>
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClearPeriod}>
            <Icon name="trash" className="ico-18" />
            <span>{t.schedule.clearPeriod}</span>
          </button>
        </div>
      </div>

      <div className="divider" />

      <div className="col" style={{ gap: 8 }}>
        <span className="t-label">{t.schedule.addSlot}</span>
        {/* Ключ по подставленному времени: шторка остаётся смонтированной
            между открытиями, и без него форма показала бы час, выбранный в
            прошлый раз, вместо того, куда нажали сейчас. */}
        <PublishSlotForm
          key={initial ? `${initial.date}T${initial.time}` : 'default'}
          onPublish={onPublish}
          submitting={publishing}
          initial={initial}
        />
      </div>
    </SideSheet>
  );
}

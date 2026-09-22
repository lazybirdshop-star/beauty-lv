'use client';

/**
 * «Открыть время» — шторка `publishSlot` прототипа «Кабинет 2026».
 *
 * Сверху сегмент «Одно окно / Период или повтор»: одно окно открывается
 * здесь же — дата, время, мастер, — а период уводит в свою шторку
 * «Опубликовать период». Внизу «Отмена» и «Опубликовать окно».
 *
 * Недельной таблицы часов здесь нет и не может быть: расписание хранится
 * опубликованными окнами, а не парами «с — до» по дням недели. Нарисовать
 * таблицу, которая никуда не пишется, значило бы обещать настройку, которой
 * нет.
 */
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '@/lib/i18n';

import type { PeriodOwner } from './bulk-publish-sheet';
import { PublishSlotForm } from './publish-slot-form';
import type { BulkPublishResult } from '../api';

const FORM_ID = 'publish-slot-form';

export function AvailabilitySheet({
  open,
  onOpenChange,
  onPublish,
  publishing,
  onOpenPeriod,
  initial,
  owner,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Моменты, которые открывает одно действие: длительность формы — их число. */
  onPublish: (startsAt: string[]) => Promise<BulkPublishResult>;
  publishing: boolean;
  /** «Период или повтор» — своя шторка с датами, днями недели и шагом. */
  onOpenPeriod: () => void;
  /** День и час клетки, по которой нажали в календаре. */
  initial?: { date: string; time: string };
  /**
   * За кого открывают время — только у того, кто ведёт чужое расписание.
   * Нет поля — время открывается себе, и вопроса «кому» шторка не задаёт.
   */
  owner?: PeriodOwner;
}) {
  const t = useT();

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.schedule.openTimeTitle}
      description={t.schedule.openTimeHint}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={publishing}>
            {publishing ? t.schedule.publishing : t.schedule.publishOne}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Tabs
          value="one"
          onValueChange={(next) => {
            if (next === 'period') onOpenPeriod();
          }}
        >
          <TabsList aria-label={t.schedule.openTimeTitle} className="sheet-tabs">
            <TabsTrigger value="one">{t.schedule.modeOne}</TabsTrigger>
            <TabsTrigger value="period">{t.schedule.modePeriod}</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Ключ по подставленному времени: шторка остаётся смонтированной
            между открытиями, и без него форма показала бы час, выбранный в
            прошлый раз, вместо того, куда нажали сейчас. */}
        <PublishSlotForm
          key={initial ? `${initial.date}T${initial.time}` : 'default'}
          formId={FORM_ID}
          hideSubmit
          onPublish={onPublish}
          submitting={publishing}
          initial={initial}
        />

        {owner ? (
          <Field id="availability-owner" label={t.schedule.member}>
            <Select
              id="availability-owner"
              value={owner.memberId}
              onChange={(event) => owner.onChange(event.target.value)}
            >
              {owner.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <p className="form-field__hint">{t.schedule.slotNote}</p>
      </div>
    </Sheet>
  );
}

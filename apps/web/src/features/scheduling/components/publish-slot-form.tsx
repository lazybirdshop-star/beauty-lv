'use client';

import { Plus } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';

import { FALLBACK_TIMEZONE, todayKey } from '@/lib/civil-date';
import { errorField } from '@/lib/api-error';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDuration, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, type Messages } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

import { SLOT_MINUTES } from '../calendar-model';
import { civilDateTimeToIso } from '../week';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';

/**
 * Длина окна: сколько времени открывает одно нажатие.
 *
 * Два часа — это одно окно «10:00–12:00», одна строка в календаре, одно
 * нажатие снять. Внутри оно по-прежнему состоит из моментов шагом сетки, и
 * это не деталь реализации ради удобства: у окна с единственным началом
 * клиент занял бы только его, и полтора часа из двух пропали бы. Общий ключ
 * (`windowId`) делает моменты одним окном, не отнимая у клиента выбор.
 */
const DURATION_OPTIONS = [30, 60, 90, 120];

interface PublishSlotFormProps {
  /** Моменты, которые нужно открыть, — подряд, шагом сетки. */
  onPublish: (startsAt: string[]) => Promise<void>;
  submitting: boolean;
  /**
   * Куда мастер нажала в календаре: день и час пустой клетки.
   *
   * Без них форма открывалась на сегодняшнем дне и десяти часах, куда бы ни
   * нажали, — то есть отвечала не на тот вопрос, который задали. Поля
   * остаются полями: подставленное время можно поправить.
   */
  initial?: { date: string; time: string };
  /** `id` формы — чтобы кнопка в подвале шторки отправляла её снаружи. */
  formId?: string;
  /** Кнопка отправки у хозяина — в подвале шторки, а не под полями. */
  hideSubmit?: boolean;
}

/**
 * Почему окно не открылось — словами, а не одним «уже опубликовано».
 *
 * Форма отвечала `slotExists` на любой отказ, и после запрета публиковать
 * поверх идущего визита это стало прямой ложью: окна на это время нет вовсе,
 * а мастер читала, что оно уже есть, и шла искать его в календаре. Час
 * окончания визита приходит вместе с кодом — тогда фраза говорит не только
 * «нельзя», но и с какого времени день снова её.
 */
function refusalText(
  error: unknown,
  t: Messages,
  locale: string,
  timeZone: string | undefined,
): string {
  const visitEndsAt = errorField(error, 'visitEndsAt');
  if (visitEndsAt) {
    return fmt(t.schedule.slotInsideVisit, { time: formatTime(visitEndsAt, locale, timeZone) });
  }
  const blockEndsAt = errorField(error, 'blockEndsAt');
  if (blockEndsAt) {
    return fmt(t.schedule.slotInsideBlockUntil, {
      time: formatTime(blockEndsAt, locale, timeZone),
    });
  }
  return describeApiError(error, t, t.schedule.slotExists);
}

/**
 * Deliberately not a Sheet: publishing a window one at a time is the whole
 * workflow (PRD.md §7.4), so it stays inline at the top of the screen and
 * only the time field resets after each add — publishing several windows
 * on the same day is a rapid, repeated tap.
 */
export function PublishSlotForm({
  onPublish,
  submitting,
  initial,
  formId,
  hideSubmit = false,
}: PublishSlotFormProps) {
  const t = useT();
  const validate = useLocalizedValidation();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const [date, setDate] = useState(() => initial?.date ?? todayKey(timeZone));
  /* Нижняя граница пикера — снимок «сегодня», взятый один раз при монтаже.
     `todayKey()` читает часы, а вызов из тела рендера — нечистый: граница
     дёргалась бы вместе с перерисовками. */
  const [earliestDate] = useState(() => todayKey(timeZone));
  const [time, setTime] = useState(initial?.time ?? '10:00');
  /* Полчаса — прежнее поведение формы: одно окно. Умолчание не меняется,
     чтобы привычное нажатие давало привычный результат. */
  const [duration, setDuration] = useState(String(SLOT_MINUTES));
  const [error, setError] = useState('');

  /**
   * Правка даты или времени гасит прежний отказ.
   *
   * Сообщение оставалось на экране до следующей отправки и висело
   * устаревшим: мастер меняла дату, а форма продолжала утверждать, что окно
   * на это время уже есть. Отказ относится к тому, что было отправлено, — как
   * только поле изменилось, он больше ни о чём.
   */
  function updateField(setter: (value: string) => void, value: string) {
    setError('');
    setter(value);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    /* «10:00» — десять часов **в салоне**. Прежняя строка собирала момент
       из `new Date('YYYY-MM-DDTHH:MM')`, то есть в поясе устройства: та же
       форма, заполненная из поездки, открывала окно на другое реальное
       время, чем видела мастер. */
    const startsAt = new Date(civilDateTimeToIso(date, time, timeZone ?? FALLBACK_TIMEZONE));

    if (startsAt.getTime() <= Date.now()) {
      setError(t.schedule.pastSlot);
      return;
    }

    /* Длина окна раскладывается на моменты шагом сетки — с них клиент может
       начать. Одним окном их делает `asOneWindow` у вызывающего. */
    const count = Math.max(1, Math.round(Number(duration) / SLOT_MINUTES));
    const moments = Array.from({ length: count }, (_, index) =>
      new Date(startsAt.getTime() + index * SLOT_MINUTES * 60_000).toISOString(),
    );

    try {
      await onPublish(moments);
    } catch (publishError) {
      setError(refusalText(publishError, t, locale, timeZone));
    }
  }

  /*
   * Формы больше не носит собственная карточка.
   *
   * Оба места, где она стоит, уже дают ей поверхность: шторка «Рабочее время»
   * и карточка шага знакомства. Своя рамка внутри чужой — это «каждый блок в
   * собственной рамке», прямой дефект по UI_GUIDELINES §2.0, и на телефоне он
   * читался как поле в поле: рамка вокруг подписи, рамка вокруг поля. Заголовок
   * тоже принадлежит хозяину: шторка уже назвала блок «Добавить окно», а
   * карточка шага — своим заголовком, и «Опубликовать окно» повторяло их
   * третьим словом.
   */
  return (
    <form id={formId} ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* `min-w-0` because a native date field carries an intrinsic minimum
            width — the browser's own widget — and `flex-1` alone will not
            shrink past it. Below 360px the pair pushed the whole page sideways.
            Visible labels, not placeholders: a native date/time placeholder
            names nothing for a screen reader and vanishes once filled (§13.3). */}
      <div className="flex gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor="publish-slot-date" className="text-xs font-semibold text-ink-soft">
            {t.schedule.date}
          </label>
          {/* `min` — сегодня по часам салона. Без него нативный пикер
                предлагал прошлое, которое форма всё равно отклоняет: выбор,
                ведущий только к отказу, предлагать не следует. */}
          <Input
            id="publish-slot-date"
            type="date"
            required
            min={earliestDate}
            value={date}
            onChange={(event) => updateField(setDate, event.target.value)}
            className="min-w-0"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor="publish-slot-time" className="text-xs font-semibold text-ink-soft">
            {t.schedule.time}
          </label>
          <Input
            id="publish-slot-time"
            type="time"
            required
            value={time}
            onChange={(event) => updateField(setTime, event.target.value)}
            className="min-w-0"
          />
        </div>
      </div>

      {/* Сколько времени открывает одно действие. Прежде вопрос не задавался
          вовсе: форма публиковала один момент, и мастер, желавшая отдать
          клиентам два часа, нажимала «Добавить окно» четыре раза. */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="publish-slot-duration" className="text-xs font-semibold text-ink-soft">
          {t.schedule.openFor}
        </label>
        <Select
          id="publish-slot-duration"
          value={String(duration)}
          onChange={(event) => updateField(setDuration, event.target.value)}
        >
          {DURATION_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {formatDuration(value, t.common)}
            </option>
          ))}
        </Select>
      </div>

      {/* Сообщение стоит **под** кнопкой, а не между полями и ею. Форма
            задумана под быстрые повторные нажатия (см. заголовок), а отказ,
            вставленный выше, сдвигал кнопку вниз примерно на 25px — и второй
            тап приходился в текст ошибки. Ниже кнопки оно не двигает ничего,
            а `role="alert"` в `FieldError` произносит его независимо от места
            в потоке. */}
      {hideSubmit ? null : (
        <Button type="submit" variant="secondary" disabled={submitting} className="self-start">
          <Plus size={18} weight="bold" />
          {submitting ? t.schedule.publishing : t.schedule.addSlot}
        </Button>
      )}
      {error ? <FieldError>{error}</FieldError> : null}
    </form>
  );
}

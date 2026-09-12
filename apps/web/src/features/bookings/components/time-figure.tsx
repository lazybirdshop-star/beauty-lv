'use client';

import { ServiceBar } from '@/components/cabinet/service-bar';
import { formatTime } from '@/lib/format';
import { useLocale } from '@/lib/i18n';
import { useTimeZone } from '@/lib/timezone';
import { cn } from '@/lib/utils';

/**
 * Крупная цифра времени — герой карточки ближайшего визита и панели визита
 * (Design System V2 §3: числа — герои; антиква — ровно в этих местах).
 *
 * Полоса услуги слева (правило 02): время принадлежит услуге. Строка под
 * цифрой — дата и длительность или клиент и услуга, решает экран.
 */
export function TimeFigure({
  startsAt,
  minutes,
  tone,
  line,
  className,
}: {
  startsAt: string;
  minutes: number;
  tone?: string | null;
  line?: React.ReactNode;
  className?: string;
}) {
  const locale = useLocale();
  const timeZone = useTimeZone();
  const endsAt = new Date(new Date(startsAt).getTime() + minutes * 60_000).toISOString();

  return (
    <div className={cn('time-figure', className)}>
      <ServiceBar tone={tone} />
      <time className="time-figure__value type-figure" dateTime={startsAt}>
        {formatTime(startsAt, locale, timeZone)}–{formatTime(endsAt, locale, timeZone)}
      </time>
      {line ? <p className="time-figure__line type-meta">{line}</p> : null}
    </div>
  );
}

'use client';

/**
 * Часы в шапке кабинета — прототип «Кабинет 2026», блок `.topbar .clock`.
 *
 * Время антиквой, под ним день недели и дата. Идут по часам заведения, а не
 * устройства: мастер, открывшая кабинет из отпуска в другом поясе, планирует
 * день салона, и «14:20» обязано значить «в салоне сейчас 14:20».
 *
 * До гидратации часы пусты — `useNow` честно отвечает `null`, и печатать
 * серверное время значило бы показать чужую минуту и тут же её заменить.
 */
import { useLocale } from '@/lib/i18n';
import { formatTime, formatWeekdayDayMonth } from '@/lib/format';
import { useNow } from '@/lib/use-now';
import { useTimeZone } from '@/lib/timezone';

export function WorkspaceClock() {
  const locale = useLocale();
  const timeZone = useTimeZone();
  /* Минута — точность подписи; чаще пересчитывать нечего. */
  const now = useNow(60_000);

  const date = now === null ? null : new Date(now);

  return (
    <div className="workspace-clock" aria-hidden={date === null}>
      <b className="workspace-clock__time tnum">
        {date ? formatTime(date, locale, timeZone) : ' '}
      </b>
      <small className="workspace-clock__date">
        {date ? formatWeekdayDayMonth(date, locale, timeZone) : ' '}
      </small>
    </div>
  );
}

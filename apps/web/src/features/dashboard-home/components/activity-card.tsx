import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardLabel } from '@/components/ui/card';
import { riseDelay } from '@/components/ui/rise';
import { filterForStatus } from '@/features/bookings/filter';
import { getBookingStatusMeta } from '@/features/bookings/status-meta';
import type { BookingStatus } from '@/features/bookings/types';
import { formatDateTime } from '@/lib/format';
import { fmt, type Messages } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

export interface ActivityEntry {
  guestName: string | null;
  status: BookingStatus;
  at: string;
}

interface ActivityCardProps {
  slug: string;
  entries: ActivityEntry[];
  locale: string;
  timeZone: string;
  t: Messages;
  className?: string;
}

/**
 * Лента последних действий — «что нового», а не «что вообще было».
 *
 * Вынесена из экрана главной отдельным модулем: на странице она занимала
 * шестьдесят строк разметки посреди загрузки данных и раскладки, и прочесть
 * порядок блоков главной за ней было нельзя.
 *
 * Серверный компонент: лента приезжает пропсом вместе со сводкой и не стоит
 * экрану ни гидратации, ни запроса.
 */
export function ActivityCard({ slug, entries, locale, timeZone, t, className }: ActivityCardProps) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardLabel className="mb-5">{t.home.recentActivity}</CardLabel>

      {entries.length === 0 ? (
        <p className="text-sm text-ink-faint">{t.home.noActivity}</p>
      ) : (
        <ul className="flex flex-col">
          {entries.map((activity, index) => {
            const meta = getBookingStatusMeta(t)[activity.status];
            return (
              /* Статус носит тот же значок, что и везде в кабинете, а не
                 приезжает голым словом `pending`. Ключ несёт и индекс: два
                 действия в одну миллисекунду редки, но реальны, а дубль ключа
                 роняет строку. */
              <li key={`${activity.at}-${index}`} className="rise" style={riseDelay(index * 50)}>
                {/* Лента сообщала о событии и отказывалась к нему вести — тупик
                    на самой посещаемой карточке кабинета. Строка открывает
                    записи уже в том положении, которому эта запись
                    принадлежит. */}
                <Link
                  href={`/${slug}/dashboard/bookings?status=${filterForStatus(activity.status)}`}
                  aria-label={fmt(t.home.recentActivityOpen, {
                    name: activity.guestName || t.home.guest,
                  })}
                  className="action-motion -mx-5 flex min-h-11 items-center justify-between gap-3 border-b border-border px-5 text-sm last:border-b-0 hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                >
                  <span className="min-w-0 truncate text-ink">
                    {activity.guestName || t.home.guest}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {/* Когда это было: «Анна · Новая» без времени заставляет
                        вспоминать, видела ли она эту строку раньше. */}
                    <time dateTime={activity.at} className="text-xs tabular-nums text-ink-faint">
                      {formatDateTime(activity.at, locale, undefined, timeZone)}
                    </time>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Лента показывает пять последних действий и на пятом обрывалась:
          шестое существует, но узнать о нём с главной было нельзя. Выход к
          полному списку — одна строка, и она честнее, чем растить ленту:
          главная отвечает «что нового», а не «что вообще было».

          `mt-auto`: в сетке разного веса карточка растянута по высоте соседней
          рельсы чисел, и выход обязан стоять на её дне, а не висеть посреди
          пустоты под пятой строкой. */}
      {entries.length > 0 ? (
        <Link
          href={`/${slug}/dashboard/bookings`}
          /* Чернилами с подчёркиванием, а не акцентом: #E2568A текстом 14px
             на белой карточке даёт 3.54:1 и проваливает AA — при переносе
             строки сюда это выяснилось замером. Розовый в системе всё равно
             занят заливкой действия и меткой занятого времени. */
          className="action-motion -mx-5 -mb-5 mt-auto flex min-h-11 items-center justify-center px-5 pt-1 text-sm text-ink underline underline-offset-4 hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        >
          {t.home.allActivity}
        </Link>
      ) : null}
    </Card>
  );
}

import { isSameDay } from '@/lib/format';

import type { Booking } from '../bookings/types';

const ACTIVE_TODAY_STATUSES: Booking['status'][] = ['pending', 'confirmed', 'completed'];

/**
 * Today's bookings a master actually cares about seeing, earliest first —
 * cancelled/no-show excluded.
 *
 * «Сегодня» считается в поясе организации, а не в поясе процесса. Раньше день
 * брался из `getFullYear/getMonth/getDate`, то есть из часового пояса того, кто
 * считает, — а считает сервер, и на Vercel он живёт в UTC. Для мастера в Риге
 * (UTC+3) это значило, что каждую ночь с 00:00 до 03:00 «сегодня» кабинета было
 * **вчерашним днём**: весь наступивший день исчезал с главной, а вместе с ним и
 * та самая ночная запись в 02:14, ради которой продукт и существует.
 *
 * Пояс приходит из `organizations.timezone` (по умолчанию `Europe/Riga`) —
 * колонка была в базе с самого начала, но её никто не читал. Именно
 * организация, а не устройство мастера: запись назначена на 10:00 в салоне, и
 * из отпуска в другом поясе день не должен разъезжаться.
 */
export function getTodaysBookings(bookings: Booking[], timeZone?: string): Booking[] {
  const now = new Date();
  return bookings
    .filter((booking) => {
      if (!ACTIVE_TODAY_STATUSES.includes(booking.status)) return false;
      return isSameDay(booking.startsAt, now, timeZone);
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

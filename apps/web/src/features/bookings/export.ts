import { downloadCsv, toCsv, type CsvColumn } from '@/lib/csv';
import type { Messages } from '@/lib/i18n/messages';

import { getBookingStatusMeta } from './status-meta';
import type { Booking } from './types';

/**
 * Записи мастера — файлом.
 *
 * Второй вопрос после адресной книги и другой по смыслу: базу клиентов уносят,
 * а записи считают. «Сколько я заработала на окрашивании во втором квартале» —
 * вопрос, на который экран финансов отвечает четырьмя срезами, а таблица
 * ответит любым, какой мастер придумает сама.
 *
 * Выгружается ровно то, что показывает экран: тот же отрезок времени и тот же
 * поиск. Иначе кнопка «скачать» под отфильтрованным списком отдавала бы файл
 * не про то, что мастер видит.
 */
function columns(t: Messages, timeZone?: string): CsvColumn<Booking>[] {
  const statusMeta = getBookingStatusMeta(t);

  /*
   * Дата и время как `2026-08-24 14:00`.
   *
   * Не языком мастера, а сортируемым видом: файл открывают в таблице, и по
   * этому столбцу сортируют. «24 авг» сортируется по алфавиту — август
   * оказывается раньше января.
   *
   * `sv-SE` — не опечатка и не про Швецию: это единственная широко
   * поддерживаемая локаль, чей формат по умолчанию совпадает с ISO. Пояс —
   * салона: `startsAt` это момент времени, а мастер считает в часах своего
   * города.
   */
  const when = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  });

  return [
    {
      header: t.bookings.exportWhen,
      value: (booking) => when.format(new Date(booking.startsAt)),
    },
    { header: t.bookings.exportClient, value: (booking) => booking.guestName },
    { header: t.bookings.exportPhone, value: (booking) => booking.guestPhone },
    {
      header: t.bookings.exportServices,
      value: (booking) => booking.items.map((item) => item.serviceNameSnapshot).join('; '),
    },
    {
      header: t.bookings.exportAmount,
      /* Числом в основных единицах, а не строкой «35,00 €»: в таблице по этому
         столбцу считают сумму, и знак валюты превратил бы его в текст.
         Разделитель — точка: `Intl` дал бы запятую, которую CSV прочтёт как
         конец поля. */
      value: (booking) =>
        (booking.items.reduce((sum, item) => sum + item.priceAmountSnapshot, 0) / 100).toFixed(2),
    },
    {
      header: t.bookings.exportCurrency,
      value: (booking) => booking.items[0]?.priceCurrencySnapshot ?? '',
    },
    { header: t.bookings.exportStatus, value: (booking) => statusMeta[booking.status].label },
    { header: t.bookings.exportNote, value: (booking) => booking.notes },
  ];
}

function filename(slug: string): string {
  return `amolie-${slug}-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
}

export function exportBookings(
  bookings: Booking[],
  slug: string,
  t: Messages,
  timeZone?: string,
): void {
  downloadCsv(filename(slug), toCsv(bookings, columns(t, timeZone)));
}

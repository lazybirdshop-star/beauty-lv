import type { Messages } from '@/lib/i18n/messages';
import { downloadCsv, toCsv, type CsvColumn } from '@/lib/csv';

import type { Client } from './types';

/**
 * Адресная книга мастера — файлом.
 *
 * База клиентов принадлежит ей, а не продукту: она собирала её годами, и
 * унести её она должна уметь сама, без просьб к поддержке и без выгрузки из
 * базы руками. Это же и есть переносимость данных, о которой спрашивают, когда
 * задумываются, не уйти ли.
 *
 * Столбцы — ровно то, что мастер видит в карточке. Внутренних идентификаторов
 * здесь нет намеренно: в чужой таблице они бесполезны, а вот прочитать по ним
 * что-то о нашей базе — можно.
 */
function columns(t: Messages): CsvColumn<Client>[] {
  return [
    { header: t.clients.exportName, value: (client) => client.fullName },
    { header: t.clients.exportPhone, value: (client) => client.phone },
    { header: t.clients.exportEmail, value: (client) => client.email },
    { header: 'Instagram', value: (client) => client.instagramHandle },
    { header: t.clients.exportVisits, value: (client) => client.visitStats.totalBookings },
    {
      header: t.clients.exportLastVisit,
      /* Дата в ISO, а не в виде, который читает человек: файл открывают в
         таблице, и там сортировка по столбцу должна работать. `«12 августа»`
         сортируется по алфавиту. */
      value: (client) => client.visitStats.lastVisitAt?.slice(0, 10) ?? '',
    },
    { header: t.clients.exportNotes, value: (client) => client.notes },
    {
      header: t.clients.exportBlocked,
      value: (client) => (client.isBlocked ? t.common.yes : ''),
    },
  ];
}

/** Имя файла с датой: выгрузки копятся в «Загрузках», и различать их надо. */
function filename(slug: string): string {
  return `amolie-${slug}-clients-${new Date().toISOString().slice(0, 10)}.csv`;
}

export function exportClients(clients: Client[], slug: string, t: Messages): void {
  downloadCsv(filename(slug), toCsv(clients, columns(t)));
}

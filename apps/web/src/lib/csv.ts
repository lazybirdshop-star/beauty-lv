/**
 * Сборка CSV и отдача его браузеру.
 *
 * Нужен там, где мастер хочет унести свои данные: адресную книгу — в телефон
 * или к бухгалтеру, записи — в таблицу, где она считает по-своему. Это же
 * ответ на «отдайте мои данные»: база клиентов принадлежит мастеру, а не
 * продукту, и уносить её она должна уметь без просьб к поддержке.
 */

/**
 * Одно значение — в поле CSV.
 *
 * Две отдельные заботы, и вторая не про формат.
 *
 * Первая — экранирование: кавычки удваиваются, а поле берётся в кавычки, если
 * содержит разделитель, кавычку или перевод строки. Заметка мастера про
 * клиента — свободный текст, и запятая в ней разъехала бы всю строку.
 *
 * Вторая — **формулы**. Excel и Google Sheets исполняют ячейку, начинающуюся с
 * `=`, `+`, `-` или `@`, а имя клиента и заметку пишет кто угодно, включая
 * гостя на публичной странице. `=HYPERLINK(...)` в чужой таблице это уже не
 * опечатка, а исполняемый код с чужого сайта. Апостроф перед таким значением
 * заставляет табличный редактор считать его текстом; в самой строке он не
 * виден, потому что редактор его и съедает.
 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '';

  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

/**
 * Строки — в текст CSV.
 *
 * Разделитель строк — `\r\n`, как требует RFC 4180: Excel на Windows иначе
 * читает файл одной строкой.
 */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => cell(column.header)).join(',');
  const body = rows.map((row) => columns.map((column) => cell(column.value(row))).join(','));
  return [header, ...body].join('\r\n');
}

/**
 * Отдать текст браузеру файлом.
 *
 * BOM в начале — не суеверие: без него Excel на Windows читает UTF-8 как
 * однобайтовую кодировку, и вся кириллица с латышскими диакритиками
 * превращается в мусор. Именно в этом виде мастер файл и открывает.
 *
 * Ссылка создаётся и убирается тут же: постоянного элемента для этого не
 * нужно, а `revokeObjectURL` обязателен — иначе каждый экспорт оставляет
 * копию файла в памяти вкладки до её закрытия.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

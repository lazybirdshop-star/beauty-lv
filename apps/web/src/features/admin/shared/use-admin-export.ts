'use client';

import { useState } from 'react';

import { downloadCsv, toCsv } from '@/lib/csv';

import { ADMIN_MAX_PAGE_SIZE, type AdminListPage } from './types';

/**
 * Предохранитель на выгрузку.
 *
 * Пять тысяч строк — это уже не «посмотреть в таблице», а выгрузка базы, и
 * делать её одним нажатием из браузера незачем: такой запрос решается
 * отдельно и осознанно. Файл, дошедший до потолка, обрывается на нём, и
 * человек об этом узнаёт из числа строк, а не из тишины.
 */
const EXPORT_MAX_ROWS = 5000;

interface AdminExportInput<T, F> {
  filters: F;
  query: string;
  fetchPage: (
    params: F & { query?: string; limit: number; offset: number },
  ) => Promise<AdminListPage<T>>;
  columns: { header: string; value: (row: T) => unknown }[];
  /** Имя файла без расширения — дата приписывается здесь. */
  name: string;
}

/**
 * Выгрузка того, что сейчас на экране, — а не всей таблицы.
 *
 * Фильтр и строка поиска уходят в запрос теми же, что у списка: кнопка под
 * отфильтрованным списком, отдающая файл про что-то другое, — худший вид
 * экспорта, потому что ошибку в нём замечают уже в чужой таблице.
 *
 * Страницы забираются по очереди через тот же публичный эндпоинт, а не
 * отдельным «экспортным» маршрутом: второй маршрут — это второе место, где
 * живёт правда о фильтрах, и однажды они разойдутся.
 */
export function useAdminExport<T, F extends Record<string, string | undefined>>({
  filters,
  query,
  fetchPage,
  columns,
  name,
}: AdminExportInput<T, F>): { exporting: boolean; run: () => void } {
  const [exporting, setExporting] = useState(false);

  async function collect(): Promise<T[]> {
    const rows: T[] = [];

    for (;;) {
      const page = await fetchPage({
        ...filters,
        query: query.trim(),
        limit: ADMIN_MAX_PAGE_SIZE,
        offset: rows.length,
      });
      rows.push(...page.items);

      const drained = page.items.length === 0 || rows.length >= page.total;
      if (drained || rows.length >= EXPORT_MAX_ROWS) return rows.slice(0, EXPORT_MAX_ROWS);
    }
  }

  return {
    exporting,
    run: () => {
      if (exporting) return;
      setExporting(true);
      void collect()
        .then((rows) => {
          const day = new Date().toISOString().slice(0, 10);
          downloadCsv(`${name}-${day}.csv`, toCsv(rows, columns));
        })
        .finally(() => setExporting(false));
    },
  };
}

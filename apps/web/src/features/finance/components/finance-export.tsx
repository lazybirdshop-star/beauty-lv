'use client';

/**
 * «Скачать CSV» на экране финансов.
 *
 * Выгружается ровно то, что показывает экран, — завершённые визиты выбранного
 * периода: файл, который не совпадает со списком под ним, хуже отсутствующего.
 *
 * Клиентский островок в серверном экране: скачивание — это работа браузера, а
 * весь остальной экран считается на сервере и остаётся статикой.
 */
import { CsvButton } from '@/features/dashboard-shell/components/csv-button';
import { downloadCsv, toCsv } from '@/lib/csv';
import { formatPrice } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

import type { CompletedRow } from './completed-table';

export function FinanceExport({
  rows,
  currency,
  slug,
  period,
}: {
  rows: CompletedRow[];
  currency: string;
  slug: string;
  period: string;
}) {
  const t = useT();
  const locale = useLocale();

  return (
    <CsvButton
      label={t.finance.exportCsv}
      disabled={rows.length === 0}
      onClick={() =>
        downloadCsv(
          `amolie-${slug}-finance-${period}.csv`,
          toCsv(rows, [
            { header: t.bookings.colDate, value: (row) => row.day },
            { header: t.bookings.colClient, value: (row) => row.clientName },
            { header: t.services.colService, value: (row) => row.serviceName },
            {
              header: t.services.colPrice,
              value: (row) => formatPrice(row.amount, currency, locale),
            },
          ]),
        )
      }
    />
  );
}

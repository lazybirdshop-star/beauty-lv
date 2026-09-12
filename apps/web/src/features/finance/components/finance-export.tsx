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
import { Icon } from '@/features/dashboard-shell/components/icon';
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

  if (rows.length === 0) return null;

  return (
    <button
      type="button"
      className="btn btn-ghost"
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
    >
      <Icon name="download" className="ico-18" />
      <span>{t.finance.exportCsv}</span>
    </button>
  );
}

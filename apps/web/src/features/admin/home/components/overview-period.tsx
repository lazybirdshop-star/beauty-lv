/**
 * Переключатель периода сводки — по артборду `AdminOverview.dc.html`.
 *
 * Ссылки, а не кнопки: период живёт в адресе (`?days=`), экран серверный, и
 * каждое число на нём приезжает уже посчитанным за выбранный срок. «Открыть в
 * новой вкладке» от этого работает само.
 *
 * `scroll={false}` — смена периода меняет числа на месте, а не увозит наверх.
 */
import Link from 'next/link';

import { Icon } from '@/features/dashboard-shell/components/icon';
import { fmt, type Messages } from '@/lib/i18n/messages';

export function OverviewPeriod({ current, t }: { current: number; t: Messages }) {
  return (
    <>
      <nav className="seg" aria-label={t.adminHome.periodLabel}>
        {[7, 30, 90].map((days) => (
          <Link
            key={days}
            href={`/admin?days=${days}`}
            scroll={false}
            aria-current={days === current ? 'page' : undefined}
            className={days === current ? 'is-on' : undefined}
          >
            {fmt(t.adminHome.periodDays, { days })}
          </Link>
        ))}
      </nav>

      {/* Обновление — переход по тому же адресу: серверный экран пересчитает
          числа заново, и своего состояния для этого не нужно. */}
      <Link
        className="btn btn-secondary btn-icon"
        href={`/admin?days=${current}`}
        prefetch={false}
        aria-label={t.common.refresh}
      >
        <Icon name="refresh" className="ico-18" />
      </Link>
    </>
  );
}

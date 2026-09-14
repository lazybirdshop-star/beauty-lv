/**
 * Переключатель периода сводки — сегмент прототипа «Кабинет 2026».
 *
 * Ссылки, а не кнопки: период живёт в адресе (`?days=`), экран серверный, и
 * каждое число на нём приезжает уже посчитанным за выбранный срок. «Открыть в
 * новой вкладке» от этого работает само.
 *
 * `scroll={false}` — смена периода меняет числа на месте, а не увозит наверх.
 */
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { fmt, type Messages } from '@/lib/i18n/messages';

export function OverviewPeriod({ current, t }: { current: number; t: Messages }) {
  return (
    <>
      <nav className="seg-pills" aria-label={t.adminHome.periodLabel}>
        {[7, 30, 90].map((days) => (
          <Link
            key={days}
            href={`/admin?days=${days}`}
            scroll={false}
            aria-current={days === current ? 'page' : undefined}
          >
            {fmt(t.adminHome.periodDays, { days })}
          </Link>
        ))}
      </nav>

      {/* Обновление — переход по тому же адресу: серверный экран пересчитает
          числа заново, и своего состояния для этого не нужно. */}
      <Button asChild variant="ghost" size="pill" className="admin-refresh">
        <Link href={`/admin?days=${current}`} prefetch={false} aria-label={t.common.refresh}>
          <Icon name="refresh" className="ico-18" />
        </Link>
      </Button>
    </>
  );
}

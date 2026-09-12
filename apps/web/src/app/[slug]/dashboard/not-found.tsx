import { EmptyState } from '@/components/ui/empty-state';
import { BackToTodayLink } from '@/features/dashboard-shell/components/back-to-today-link';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';

/**
 * Раздел, которого у этой роли нет, — экран кабинета, а не публичная 404
 * «Такого мастера не нашлось»: администратор, открывший ведомость выплат по
 * старой ссылке, остаётся в своей раме, со своей навигацией, и одной строкой
 * узнаёт, почему здесь пусто. Отдаётся всеми `notFound()` внутри кабинета.
 */
export default async function DashboardSectionNotFound() {
  const t = getMessages(await getRequestLocale());

  return (
    <EmptyState
      title={t.workspace.noSectionTitle}
      hint={t.workspace.noSectionHint}
      action={<BackToTodayLink label={t.workspace.backToToday} />}
    />
  );
}

'use client';

/**
 * «Выйти из кабинета?» — окно `logout` прототипа «Кабинет 2026».
 *
 * Выход не разрушает ничего, но возвращает к паролю, которого под рукой может
 * не оказаться: вопрос называет именно это. Согласие — главной кнопкой, не
 * красной: красным в кабинете помечено только необратимое.
 *
 * Одно окно на три входа — меню аккаунта, строки «Ещё» на телефоне и ячейку
 * «Выход» в настройках: выход обязан вести себя одинаково, откуда бы ни нажали.
 */
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { useT } from '@/lib/i18n';

import { useLogout } from '../use-logout';

export function LogoutDialog({
  open,
  onOpenChange,
  beforeLeave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Закрыть то, из чего пришли (лист «Ещё»), — перед уходом со страницы. */
  beforeLeave?: () => void;
}) {
  const t = useT();
  const { logout, leaving } = useLogout();

  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.common.logoutTitle}
      description={t.common.logoutText}
      confirmLabel={t.common.logout}
      tone="primary"
      loading={leaving}
      onConfirm={() => void logout(beforeLeave)}
    />
  );
}

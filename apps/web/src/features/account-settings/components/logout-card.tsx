'use client';

/**
 * «Выход» — последняя ячейка аккаунта в прототипе «Кабинет 2026».
 *
 * Тот же `useLogout`, что в меню аккаунта и в строках «Ещё» на телефоне:
 * выход — одно действие, и вести себя оно обязано одинаково, откуда бы ни
 * нажали.
 */
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { useLogout } from '@/features/dashboard-shell/use-logout';
import { useT } from '@/lib/i18n';

export function LogoutCard() {
  const t = useT();
  const { logout, leaving } = useLogout();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.settings.logoutTitle}</CardTitle>
      </CardHeader>
      <Button variant="ghost" size="sm" disabled={leaving} onClick={() => void logout()}>
        <Icon name="logout" className="ico-18" />
        <span>{leaving ? t.common.processing : t.common.logout}</span>
      </Button>
      <p className="settings-note">{t.settings.logoutHint}</p>
    </Card>
  );
}

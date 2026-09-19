'use client';

/**
 * «Выход» — последняя ячейка аккаунта в прототипе «Кабинет 2026».
 *
 * Та же `LogoutDialog`, что в меню аккаунта и в строках «Ещё» на телефоне:
 * выход — одно действие, и вести себя оно обязано одинаково, откуда бы ни
 * нажали.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { LogoutDialog } from '@/features/dashboard-shell/components/logout-dialog';
import { useT } from '@/lib/i18n';

export function LogoutCard() {
  const t = useT();
  const [confirming, setConfirming] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.settings.logoutTitle}</CardTitle>
      </CardHeader>
      <Button variant="secondary" size="sm" onClick={() => setConfirming(true)}>
        <Icon name="logout" className="ico-18" />
        <span>{t.settings.logoutAction}</span>
      </Button>
      <p className="settings-note">{t.settings.logoutHint}</p>
      <LogoutDialog open={confirming} onOpenChange={setConfirming} />
    </Card>
  );
}

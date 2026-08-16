'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useT } from '@/lib/i18n';

import { usePushNotifications } from '../use-push-notifications';
import type { PushState } from '../types';

type Dictionary = ReturnType<typeof useT>;

/**
 * Строка под тумблером — то единственное, ради чего у состояния больше двух
 * значений. «Не работает» без причины оставляет мастера один на один с
 * телефоном; здесь на каждый случай сказано, что именно сделать.
 */
function stateNote(state: PushState, t: Dictionary): string | null {
  switch (state) {
    case 'on':
      return t.push.on;
    case 'off':
      return t.push.off;
    case 'denied':
      return t.push.denied;
    case 'needs-install':
      return t.push.needsInstall;
    case 'unsupported':
      return t.push.unsupported;
    case 'unavailable':
      return t.push.unavailable;
    case 'checking':
      return null;
  }
}

/**
 * Уведомления о новых записях — мастеру, на её устройство.
 *
 * Тумблер показывается только там, где ему есть что переключать. В остальных
 * случаях его нет вовсе: выключатель, который заведомо ничего не включит —
 * ровно то, за что с этого экрана уже убрали переключатели напоминаний.
 */
export function PushNotificationsCard() {
  const t = useT();
  const { state, busy, failed, enable, disable } = usePushNotifications();

  if (state === 'checking') {
    return <Skeleton className="h-40 w-full" />;
  }

  const switchable = state === 'on' || state === 'off';
  const note = stateNote(state, t);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.push.title}</CardTitle>
        {switchable ? (
          <Switch
            checked={state === 'on'}
            disabled={busy}
            onCheckedChange={(checked) => void (checked ? enable() : disable())}
            label={t.push.toggleLabel}
          />
        ) : null}
      </CardHeader>

      <p className="-mt-2 mb-3 text-xs text-ink-faint">{t.push.hint}</p>

      {note ? <p className="text-[15px] text-ink-soft">{note}</p> : null}
      {failed ? <p className="mt-2 text-sm text-danger">{t.push.failed}</p> : null}

      {/* Обещать доставку было бы враньём — см. `reliability`. Абзац стоит
          последним и набран мелко: он для того, кто задумается «а если не
          придёт», и не мешает тому, кто просто включает тумблер. */}
      <p className="mt-4 text-xs text-ink-faint">{t.push.reliability}</p>
    </Card>
  );
}

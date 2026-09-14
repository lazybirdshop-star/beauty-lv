'use client';

import { Card, CardHeader, CardHint, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SwitchRow } from '@/components/ui/switch-row';
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

interface PushNotificationsCardProps {
  /**
   * Чем эта карточка называется на своём экране.
   *
   * У мастера речь о записях, у администратора — о заявках на регистрацию.
   * Механика подписки при этом одна и та же: подписка принадлежит устройству
   * и человеку, а не тому, о чём именно ему напишут. Второй такой же
   * компонент разошёлся бы с этим на первой же правке — например, когда
   * появится третий повод для уведомления.
   */
  title?: string;
  hint?: string;
  toggleLabel?: string;
  /**
   * Оговорка о надёжности: уведомление — быстрый путь, а не замена кабинету.
   *
   * У неё та же развилка, что у заголовка, и до этой правки её не было:
   * администратор читал «сама запись всегда ждёт вас в разделе „Записи“», хотя
   * ждёт его заявка и раздел у него называется «Заявки». Одна фраза на два
   * разных повода была неправдой ровно наполовину.
   */
  reliability?: string;
}

/**
 * Уведомления на это устройство.
 *
 * Тумблер показывается только там, где ему есть что переключать. В остальных
 * случаях его нет вовсе: выключатель, который заведомо ничего не включит —
 * ровно то, за что с этого экрана уже убрали переключатели напоминаний.
 */
export function PushNotificationsCard({
  title,
  hint,
  toggleLabel,
  reliability,
}: PushNotificationsCardProps = {}) {
  const t = useT();
  const { state, busy, failed, enable, disable } = usePushNotifications();

  if (state === 'checking') {
    return <Skeleton className="h-40 w-full" />;
  }

  const switchable = state === 'on' || state === 'off';
  const note = stateNote(state, t);

  /* Строка тумблера прототипа «Кабинет 2026»: подпись, под ней — что сейчас
     на этом устройстве. Без тумблера состояние говорится словами. */
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title ?? t.push.title}</CardTitle>
          <CardHint>{hint ?? t.push.hint}</CardHint>
        </div>
      </CardHeader>

      {switchable ? (
        <SwitchRow
          label={toggleLabel ?? t.push.toggleLabel}
          hint={note}
          checked={state === 'on'}
          disabled={busy}
          onChange={(checked) => void (checked ? enable() : disable())}
        />
      ) : note ? (
        <p className="push-note">{note}</p>
      ) : null}
      {failed ? <p className="push-failed">{t.push.failed}</p> : null}

      {/* Обещать доставку было бы враньём — см. `reliability`. Абзац стоит
          последним и набран мелко: он для того, кто задумается «а если не
          придёт», и не мешает тому, кто просто включает тумблер. */}
      <p className="settings-note">{reliability ?? t.push.reliability}</p>
    </Card>
  );
}

'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api-error';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import { deleteMaster, exportMaster } from '../api';

/**
 * Сколько визитов держат аккаунт — из тела отказа, а не из его текста.
 *
 * Серверная проза по-русски, а панель говорит на трёх языках: число приходит
 * отдельным полем, фразу вокруг него собирает интерфейс.
 */
function upcomingBookings(error: unknown): number | null {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) {
    return null;
  }
  const value = (error.body as Record<string, unknown>).upcomingBookings;
  return typeof value === 'number' ? value : null;
}

/**
 * Удаление аккаунта и выгрузка данных.
 *
 * Отдельной карточкой внизу, а не кнопкой в ряду решений: у удаления нет
 * обратной кнопки, и стоять рядом с «Заблокировать» оно не должно —
 * блокировку снимают одним нажатием, аккаунт не возвращают никак.
 */
export function DangerZone({ masterId, masterName }: { masterId: string; masterName: string }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const remove = useMutation({
    mutationFn: () => deleteMaster(masterId),
    onSuccess: () => {
      setConfirming(false);
      toast({ message: t.admin.accountDeleted });
      router.push('/admin/masters');
      router.refresh();
    },
    onError: (error: unknown) => {
      const blocked = upcomingBookings(error);
      toast({
        tone: 'danger',
        message:
          blocked === null
            ? t.common.actionFailed
            : fmt(t.admin.deleteBlockedByBookings, { count: blocked }),
      });
    },
  });

  const download = useMutation({
    mutationFn: () => exportMaster(masterId),
    onSuccess: (data) => {
      /* Файл собирается в браузере: выгрузка — это тот же ответ API, только
         сохранённый, и отдельный маршрут ради заголовка Content-Disposition
         был бы вторым местом, где живёт её состав. */
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `amolie-account-${masterId}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },
    onError: () => toast({ tone: 'danger', message: t.common.actionFailed }),
  });

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <CardTitle>{t.admin.dangerZone}</CardTitle>
      </CardHeader>

      <p className="text-sm text-ink-soft">{t.admin.exportHint}</p>
      <Button
        variant="secondary"
        className="self-start"
        disabled={download.isPending}
        onClick={() => download.mutate()}
      >
        {download.isPending ? t.common.processing : t.admin.exportAccount}
      </Button>

      <p className="mt-2 text-sm text-ink-soft">{t.admin.deleteHint}</p>
      <Button
        variant="danger"
        className="self-start"
        disabled={remove.isPending}
        onClick={() => setConfirming(true)}
      >
        {t.admin.deleteAccount}
      </Button>

      <ConfirmSheet
        open={confirming}
        onOpenChange={setConfirming}
        title={fmt(t.admin.deleteAccountTitle, { name: masterName })}
        description={t.admin.deleteAccountDescription}
        confirmLabel={t.admin.deleteAccount}
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </Card>
  );
}

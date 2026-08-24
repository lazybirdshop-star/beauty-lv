'use client';

import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

interface BlockAccountSheetProps {
  /** Кого блокируем. `null` — лист закрыт. */
  account: { id: string; fullName: string } | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  submitting: boolean;
}

/**
 * Подтверждение блокировки аккаунта.
 *
 * Блокировка — единственное действие админки, которое человек по ту сторону
 * замечает немедленно: сессия перестаёт быть действительной на первом же
 * запросе (`access-token.ts`), а не когда истечёт токен. До этого она
 * выполнялась одним нажатием в списке, без вопроса и без подписи — рядом с
 * такой же кнопкой соседней строки.
 *
 * Разблокировка подтверждения не требует: она возвращает доступ, а не
 * отнимает его, и лишний вопрос там учит не читать вопросы.
 */
export function BlockAccountSheet({
  account,
  onOpenChange,
  onConfirm,
  submitting,
}: BlockAccountSheetProps) {
  const t = useT();

  return (
    <ConfirmSheet
      open={Boolean(account)}
      onOpenChange={onOpenChange}
      title={fmt(t.admin.blockTitle, { name: account?.fullName ?? '' })}
      description={t.admin.blockDescription}
      confirmLabel={t.admin.block}
      onConfirm={onConfirm}
      loading={submitting}
    />
  );
}

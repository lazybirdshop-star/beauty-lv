'use client';

import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import type { MemberConfirm } from '../use-member-actions';

/** «Отстранить Юлю?» и «Вернуть Юлю в строй?» — с числом визитов, если они есть. */
export function MemberConfirmSheet({
  confirm,
  loading,
  onClose,
  onConfirm,
}: {
  confirm: MemberConfirm | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useT();
  const disabling = confirm?.kind === 'disable';

  return (
    <ConfirmSheet
      open={Boolean(confirm)}
      onOpenChange={(open) => !open && onClose()}
      title={
        confirm
          ? fmt(disabling ? t.team.disableTitle : t.team.restoreTitle, {
              name: confirm.member.name,
            })
          : ''
      }
      description={
        confirm?.kind === 'disable'
          ? confirm.upcoming
            ? `${t.team.disableBody} ${fmt(t.team.disableLoad, { count: confirm.upcoming })}`
            : t.team.disableBody
          : t.team.restoreBody
      }
      confirmLabel={disabling ? t.team.disable : t.team.restore}
      loading={loading}
      onConfirm={onConfirm}
    />
  );
}

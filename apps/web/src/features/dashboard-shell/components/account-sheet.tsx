'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { Sheet } from '@/components/ui/sheet';
import { getMyAvatar } from '@/features/design-studio/api';
import { initials } from '@/lib/avatar';
import { useT } from '@/lib/i18n';

import { useWorkspace } from '../workspace-context';
import { AccountRows } from './account-rows';
import { Icon } from './icon';
import { MemberAvatar } from './member-avatar';

/**
 * Аккаунт на телефоне — портрет в строке экрана и шторка по нажатию.
 *
 * Прежде здесь раскрывался десктопный `<details>`-список, переделанный CSS в
 * лист: без ручки, заголовка и крестика, в слое строки инструментов, откуда
 * он уходил под нижнюю панель. Теперь это та же шторка, что у всех окон
 * кабинета: ручка, имя человека заголовком, роль подписью, крестик, строки
 * листа «Ещё». Одна анатомия на все листы.
 */
export function AccountSheet({
  accountName,
  roleLabel,
}: {
  accountName: string;
  roleLabel: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const workspace = useWorkspace();
  const ownAvatar = useQuery({
    queryKey: ['member-avatar', workspace?.slug],
    queryFn: () => getMyAvatar(workspace!.slug),
    enabled: Boolean(workspace),
    staleTime: 5 * 60_000,
  });
  const settingsHref = workspace ? `/${workspace.slug}/dashboard/settings` : '/admin/settings';

  return (
    <>
      <button
        type="button"
        className="account-card account-sheet__trigger"
        aria-label={accountName}
        onClick={() => setOpen(true)}
      >
        {ownAvatar.data?.avatar ? (
          <MemberAvatar
            className="account-card__avatar"
            name={accountName}
            seed={accountName}
            url={ownAvatar.data.avatar.url}
            focal={ownAvatar.data.avatar.focal}
          />
        ) : (
          <span className="avatar account-card__avatar" aria-hidden="true">
            {initials(accountName, 'A')}
          </span>
        )}
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={accountName}
        description={roleLabel}
        placement="bottom"
      >
        <div className="menu-rows">
          <Link href={settingsHref} className="mrow" onClick={() => setOpen(false)}>
            <Icon name="settings" className="ico-18" />
            <span>{t.nav.settings}</span>
            <Icon name="chevR" className="ico-16 chev" />
          </Link>
          <AccountRows onDone={() => setOpen(false)} />
        </div>
      </Sheet>
    </>
  );
}

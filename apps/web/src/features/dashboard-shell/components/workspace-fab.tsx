'use client';

/**
 * «Создать» на телефоне — центральная вкладка нижней панели (прототип
 * «Кабинет 2026»).
 *
 * Прежде это была круглая кнопка, висевшая поверх панели и перекрывавшая
 * строки списков. Теперь она встала в свой слот посреди вкладок, приподнятая
 * над линией панели: главный вход в работу с телефона, и он единственный
 * такой на экране.
 *
 * Меню «Создать» в шапке на телефоне по-прежнему прячется: два входа в одно
 * и то же на одном экране читаются как два разных действия. Набор действий
 * тот же, что в меню и в палитре ⌘K.
 */
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Sheet } from '@/components/ui/sheet';
import { useT } from '@/lib/i18n';

import { runCommand, type WorkspaceCommand } from '../workspace-commands';
import { Icon } from './icon';

export function WorkspaceFab({ commands }: { commands: WorkspaceCommand[] }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (commands.length === 0) return null;

  return (
    <>
      <button type="button" className="workspace-fab" onClick={() => setOpen(true)}>
        <span className="workspace-fab__dot">
          <Icon name="plus" className="ico-24" />
        </span>
        <span className="bnav__label">{t.workspace.create}</span>
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={t.workspace.create} placement="bottom">
        <div className="menu-rows">
          {commands.map((command) => (
            <button
              type="button"
              key={command.id}
              className="mrow"
              onClick={() => {
                setOpen(false);
                runCommand(command, router);
              }}
            >
              <Icon name={command.icon} className="ico-18" />
              <span>{command.label}</span>
              <Icon name="chevR" className="ico-16 chev" />
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}

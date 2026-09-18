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
 * Открывает шторку `create` прототипа: «Что завести», строка на действие —
 * значок, название, что оно заводит, стрелка. Набор действий тот же, что в
 * меню «Создать» и в палитре ⌘K.
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
      <button
        type="button"
        className="workspace-fab"
        aria-label={t.workspace.create}
        onClick={() => setOpen(true)}
      >
        <span className="workspace-fab__dot">
          <Icon name="plus" className="ico-24" />
        </span>
        <span className="bnav__label">{t.workspace.create}</span>
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={t.workspace.create}
        description={t.workspace.createHint}
        placement="bottom"
      >
        <div className="create-rows">
          {commands.map((command) => (
            <button
              type="button"
              key={command.id}
              className="create-row"
              onClick={() => {
                setOpen(false);
                runCommand(command, router);
              }}
            >
              <span className="create-row__icon" aria-hidden="true">
                <Icon name={command.icon} className="ico-18" />
              </span>
              <span className="create-row__text">
                <b>{command.label}</b>
                {command.hint ? <span>{command.hint}</span> : null}
              </span>
              <Icon name="chevR" className="ico-16 create-row__chev" />
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}

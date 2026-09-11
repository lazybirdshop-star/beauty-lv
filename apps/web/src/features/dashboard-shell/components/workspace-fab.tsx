'use client';

/**
 * «Создать» на телефоне — круглая кнопка над нижней панелью (спецификация §84).
 *
 * Меню «Создать» в шапке экрана на телефоне уезжает вверх вместе с прокруткой,
 * и новая запись посреди длинного списка клиентов начиналась с пролистывания
 * обратно. Кнопка остаётся под большим пальцем и открывает лист снизу с тем же
 * набором действий, что меню и палитра ⌘K. На большом экране её нет — там
 * меню «Создать» всегда на виду.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useT } from '@/lib/i18n';

import { runCommand, type WorkspaceCommand } from '../workspace-commands';
import { Icon } from './icon';

export function WorkspaceFab({ commands }: { commands: WorkspaceCommand[] }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (commands.length === 0) return null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="btn btn-primary workspace-fab"
          aria-label={t.workspace.create}
        >
          <Icon name="plus" className="ico-24" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content className="amolie-app sheet" aria-describedby={undefined}>
          <Dialog.Title className="t-section" style={{ padding: '18px 16px 10px' }}>
            {t.workspace.create}
          </Dialog.Title>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

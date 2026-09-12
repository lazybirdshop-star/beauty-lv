'use client';

/**
 * «Создать» на телефоне — розовая круглая кнопка 56 px над нижней панелью,
 * под большой палец (Design System V2 §7, спецификация §84).
 *
 * Меню «Создать» в шапке экрана на телефоне уезжает вверх вместе с прокруткой,
 * и новая запись посреди длинного списка клиентов начиналась с пролистывания
 * обратно. Кнопка остаётся под пальцем и открывает лист снизу с тем же
 * набором действий, что меню и палитра ⌘K. На большом экране её нет — там
 * меню «Создать» всегда на виду.
 */
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
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
      <Button
        variant="primary"
        size="icon"
        className="workspace-fab"
        aria-label={t.workspace.create}
        onClick={() => setOpen(true)}
      >
        <Icon name="plus" className="ico-24" />
      </Button>
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

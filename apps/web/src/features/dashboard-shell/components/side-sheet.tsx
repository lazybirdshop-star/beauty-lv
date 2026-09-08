'use client';

/**
 * Боковая шторка — по артбордам `Availability.dc.html` и `BookingCreate.dc.html`.
 *
 * 520px справа, тень `--shadow-sheet`, шапка с заголовком, подписью, «Esc» и
 * крестиком. Одна на весь кабинет: у макета все правки живут в ней, и второй
 * экземпляр этой рамки однажды разошёлся бы с первым по отступу.
 *
 * На телефоне уезжает вниз и занимает четыре пятых высоты: боковая панель в
 * 520px на экране в 390 — это не шторка, а вторая страница.
 */
import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

import { Icon } from './icon';

export function SideSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  footer,
  closeLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Полоса действий у нижнего края — остаётся на месте при прокрутке. */
  footer?: ReactNode;
  closeLabel: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content className="amolie-app side-sheet" aria-describedby={undefined}>
          {/* Ручка — только на телефоне, где шторка приезжает снизу: она
              говорит «это тянется вниз», и на боковой панели смысла не имеет.
              Прячет её CSS, а не условие в разметке: ширина окна — вопрос
              оформления, и знать о ней компоненту незачем. */}
          <span className="side-sheet__grip" aria-hidden="true" />
          <div className="side-sheet__head">
            <div className="col">
              <Dialog.Title style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>
                {title}
              </Dialog.Title>
              {subtitle ? <span className="t-meta">{subtitle}</span> : null}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <span className="kbd side-sheet__kbd">Esc</span>
              <Dialog.Close
                className="btn btn-secondary btn-icon"
                aria-label={closeLabel}
                style={{ borderColor: 'transparent' }}
              >
                <Icon name="x" className="ico-18" />
              </Dialog.Close>
            </div>
          </div>

          <div className="side-sheet__body">{children}</div>

          {footer ? <div className="side-sheet__foot">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

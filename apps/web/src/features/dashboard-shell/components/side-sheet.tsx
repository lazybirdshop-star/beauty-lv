'use client';

/**
 * @deprecated Обёртка совместимости над `Sheet` (`components/ui/sheet`).
 *
 * До Design System V2 в кабинете жили две шторки: эта — панель справа с
 * футером, и `Sheet` — плавающая карточка снизу. Теперь панель — сам `Sheet`
 * в кабинете (handoff §4, R-24), а этот файл только переводит прежние имена
 * пропов (`subtitle`, `closeLabel`) в его API, чтобы восемь потребителей
 * переезжали по одному, без большого патча. Новый код импортирует `Sheet`
 * напрямую; файл удаляется вместе с последним импортом `SideSheet`.
 */
import type { ReactNode } from 'react';

import { Sheet } from '@/components/ui/sheet';

export function SideSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Полоса действий у нижнего края — остаётся на месте при прокрутке. */
  footer?: ReactNode;
  /** Подпись крестика приходит из словаря самого `Sheet`; пропу больше не нужна. */
  closeLabel?: string;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={subtitle}
      footer={footer}
      surface="app"
    >
      <div className="flex flex-col gap-4">{children}</div>
    </Sheet>
  );
}

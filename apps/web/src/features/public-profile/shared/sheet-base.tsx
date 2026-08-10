'use client';

import { X } from '@phosphor-icons/react';
import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { SheetChrome } from '../contracts/chrome';

/**
 * Ручка продуктовой шторки: брусок, размер и форма которого несут токены
 * `--handle-*` мира (0×0 сворачивает её там, где край несёт шов).
 */
export function DefaultSheetHandle() {
  return (
    <div
      className="mx-auto mb-4 h-[var(--handle-height)] w-[var(--handle-width)] rounded-[var(--handle-radius)] bg-border-strong"
      aria-hidden="true"
    />
  );
}

/** Продуктовое закрытие: квадрат с линейкой и X; мир может заменить его своим. */
export function DefaultSheetCloseButton() {
  const t = useT();
  return (
    <Dialog.Close className="press flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border border-border-strong text-ink hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
      <X size={17} weight="bold" />
      <span className="sr-only">{t.common.close}</span>
    </Dialog.Close>
  );
}

/**
 * Хром эталонных миров (soft и poster, §5): ровно то, что сегодня рисует
 * `components/ui/sheet.tsx`, — панель читает токены мира
 * (`--panel-radius`, `--surface-shadow`), анимация входа/выхода едет на
 * токенизированных keyframes `--anim-sheet-in/out` через правила
 * `.sheet-panel[data-state]` в globals.css, поэтому отдельных классов
 * входа/выхода нет.
 */
export const defaultSheetChrome: SheetChrome = {
  panelClassName:
    'sheet-panel fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[min(88dvh,760px)] max-w-[520px] flex-col overflow-hidden rounded-t-[var(--panel-radius)] border-t-2 border-accent bg-bg shadow-[var(--surface-shadow)] outline-none sm:inset-x-3 sm:bottom-6 sm:rounded-[var(--panel-radius)] sm:border-2',
  Handle: DefaultSheetHandle,
  panelInClass: '',
  panelOutClass: '',
};

interface SheetBaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /**
   * Приколоченная зона действий. Рендерится вне скроллящегося тела, поэтому
   * не может перекрыть последнее поле, как это делает `position: sticky`,
   * когда содержимое выше шторки.
   */
  footer?: ReactNode;
  /** Внешний вид и движение мира (§7.4) — единственное, чем мир владеет здесь. */
  chrome: SheetChrome;
  children: ReactNode;
}

/**
 * Headless-шторка публичной страницы (BRAND_STYLE_ARCHITECTURE.md §7.4):
 * поведение диалога реализуется один раз на продукт — портал Radix,
 * фокус-ловушка, ESC, скролл-лок, `aria-describedby` (отсутствует, когда
 * нет описания), кап высоты, подвал вне скролла. Мир получает только
 * `SheetChrome` — вид и движение; доступность шторки мир сломать не может,
 * потому что ею не владеет.
 *
 * Кабинетная `components/ui/sheet.tsx` остаётся отдельным компонентом
 * дашборда; эталонные миры сидят на `defaultSheetChrome`, чья разметка
 * повторяет её один к одному.
 */
export function SheetBase({
  open,
  onOpenChange,
  title,
  description,
  footer,
  chrome,
  children,
}: SheetBaseProps) {
  const CloseButton = chrome.CloseButton ?? DefaultSheetCloseButton;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Оттенок и blur гашения живут в правиле `.sheet-overlay` и читают
            токены `--overlay-*` мира — класс Tailwind здесь перекрыл бы их
            (утилиты сильнее components-слоя). */}
        <Dialog.Overlay className={chrome.overlayClassName ?? 'sheet-overlay fixed inset-0 z-40'} />
        <Dialog.Content
          {...(!description ? { 'aria-describedby': undefined } : {})}
          className={cn(chrome.panelClassName, chrome.panelInClass, chrome.panelOutClass)}
        >
          <div className="shrink-0 px-5 pt-4">
            {chrome.Handle ? <chrome.Handle /> : null}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Dialog.Title className="font-display text-[22px] leading-tight [font-weight:var(--display-weight)] text-ink">
                  {title}
                </Dialog.Title>
                {description ? (
                  <Dialog.Description className="mt-1 text-sm text-ink-soft">
                    {description}
                  </Dialog.Description>
                ) : null}
              </div>
              <CloseButton />
            </div>
          </div>

          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5',
              footer ? 'pb-1' : 'pb-5',
            )}
          >
            {children}
          </div>

          {footer ? <div className="shrink-0 px-5 pb-5 pt-3">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

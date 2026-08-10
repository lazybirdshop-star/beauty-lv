import { X } from '@phosphor-icons/react';
import * as Dialog from '@radix-ui/react-dialog';

import { useT } from '@/lib/i18n';

import type { SheetChrome } from '../../contracts/chrome';

/**
 * Закрытие этого мира: тихий крест без рамки — «×» макета. Hover уводит
 * глиф из блёклого в чернь за 300ms (тайминги несёт `luxury-action`).
 * Зона 44×44 честная, сама кнопка её и несёт.
 */
function LuxurySheetCloseButton() {
  const t = useT();
  return (
    <Dialog.Close className="luxury-action flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-ink-faint hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
      <X size={17} weight="regular" />
      <span className="sr-only">{t.common.close}</span>
    </Dialog.Close>
  );
}

/**
 * Ручка макета «Bergs»: брусок 40×3 с радиусом 2 в цвете тихой линейки.
 * Продуктовая `DefaultSheetHandle` красит брусок в `border-strong`, который
 * в этом мире — чернь; здесь ручка обязана оставаться тихой (#C8BFB2).
 */
function LuxurySheetHandle() {
  return (
    <div
      className="mx-auto mb-3 h-[var(--handle-height)] w-[var(--handle-width)] rounded-[var(--handle-radius)] bg-border"
      aria-hidden="true"
    />
  );
}

/**
 * Хром шторки Luxury («Bergs»): печатный лист, поднявшийся снизу, — панель
 * цвета листа (`--bg`), верхний край несёт чернильный шов 2px, углы прямые
 * на всех вьюпортах (токен `--panel-radius: 0`), теней нет. Ширина панели
 * равна ширине листа (480px) — шторка продолжает разворот, а не парит над
 * ним. Анимация токенизирована (`sheet-panel` + `--anim-sheet-*`: подъём
 * 40px за 520/280ms без scale). Оверлей — `luxury-overlay` из motion.css
 * мира: гашение чернью 35% (rgba(32,26,20,.35) макета), без blur.
 */
export const sheetChrome: SheetChrome = {
  panelClassName:
    'sheet-panel fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[min(88dvh,760px)] w-full max-w-[480px] flex-col overflow-hidden border-t-2 border-border-strong bg-bg outline-none sm:border-x',
  Handle: LuxurySheetHandle,
  CloseButton: LuxurySheetCloseButton,
  panelInClass: '',
  panelOutClass: '',
  overlayClassName: 'luxury-overlay fixed inset-0 z-40',
};

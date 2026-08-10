import { X } from '@phosphor-icons/react';
import * as Dialog from '@radix-ui/react-dialog';

import { useT } from '@/lib/i18n';

import type { SheetChrome } from '../../contracts/chrome';
import { FOCUS_RING } from './ui';

/**
 * Закрытие этого мира: круглая стеклянная кнопка — тот же объект, что
 * иконко-кнопки шапки. Hover поднимает её на 2px и углубляет тень, press
 * продавливает до 0.96 с пружинным возвратом. Зона 44×44 честная.
 */
function NeoGlassSheetCloseButton() {
  const t = useT();
  return (
    <Dialog.Close
      className={`neo-glass-pane neo-glass-action neo-glass-lift flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink ${FOCUS_RING}`}
    >
      <X size={17} weight="regular" />
      <span className="sr-only">{t.common.close}</span>
    </Dialog.Close>
  );
}

/**
 * Ручка шторки — стеклянная капсула 40×5 (§9 «Форма»). Продуктовая
 * `DefaultSheetHandle` красит брусок сплошным `--border-strong`; здесь
 * ручка обязана быть из того же материала, что панель под ней, иначе она
 * читается наклейкой на стекле.
 */
function NeoGlassSheetHandle() {
  return (
    <div
      className="neo-glass-sunken mx-auto mb-4 h-[var(--handle-height)] w-[var(--handle-width)] rounded-[var(--handle-radius)]"
      aria-hidden="true"
    />
  );
}

/**
 * Хром шторки Neo Glass (§9, §13): стеклянная панель, которая не встаёт в
 * нижнюю кромку экрана, а парит — с `sm` она отходит от краёв на 8px и
 * замыкает все четыре непрерывных угла 28px; на телефоне нижние углы
 * садятся на кромку, потому что 8px воздуха под пальцем — это потерянная
 * зона нажатия, а не глубина.
 *
 * Материал — `neo-glass-pane`: подложка 55%, blur 18px, световая кромка и
 * верхний блик, с честным фолбэком в сплошной `--bg-raised` без
 * `backdrop-filter` и при `prefers-reduced-transparency`.
 *
 * Движение токенизировано (`sheet-panel` + `--anim-sheet-*`): взлёт на
 * 64px с `scale(0.94) → 1` за 480ms по пружинной кривой, уход за 240ms без
 * перелёта. Оверлей — `neo-glass-overlay`: гашение 45% плюс статичный blur
 * 8px, за которым страница уходит в глубину.
 */
export const sheetChrome: SheetChrome = {
  panelClassName:
    'sheet-panel neo-glass-pane fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[min(88dvh,760px)] max-w-[520px] flex-col overflow-hidden rounded-t-[var(--panel-radius)] outline-none sm:inset-x-2 sm:bottom-2 sm:rounded-[var(--panel-radius)]',
  Handle: NeoGlassSheetHandle,
  CloseButton: NeoGlassSheetCloseButton,
  panelInClass: '',
  panelOutClass: '',
  overlayClassName: 'neo-glass-overlay fixed inset-0 z-40',
};

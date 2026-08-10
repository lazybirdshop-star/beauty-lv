import { X } from '@phosphor-icons/react';
import * as Dialog from '@radix-ui/react-dialog';

import { useT } from '@/lib/i18n';

import type { SheetChrome } from '../../contracts/chrome';

/**
 * Закрытие этого мира: точный квадрат 8px с волосяной линейкой (§6 «Форма»).
 * Hover — только край, 100ms на кривой мира; никакого заливочного шума.
 * Зона 44×44 честная, сама кнопка её и несёт.
 */
function MinimalSheetCloseButton() {
  const t = useT();
  return (
    <Dialog.Close className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--control-radius)] border border-border text-ink transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
      <X size={17} weight="light" />
      <span className="sr-only">{t.common.close}</span>
    </Dialog.Close>
  );
}

/**
 * Хром шторки Minimal (BRAND_STYLES.md §6): инженерная геометрия и ни одной
 * тени. Ручки нет сознательно — верхний край несёт волосяная линейка-шов
 * (`border-t`), радиус панели 16px приезжает из токена `--panel-radius`.
 * Панель белая и плоская: заливки и рамки в этом мире почти не работают,
 * поэтому линейка — единственный материал края. Анимация токенизирована
 * (`sheet-panel` + `--anim-sheet-*` читают 220/140ms и подъём 24px без
 * scale), поэтому классы входа/выхода пусты — как у эталонных миров.
 * Оверлей продуктовый: гашение чернью 40% без blur едет из токенов
 * `--overlay-*` этого мира.
 */
export const sheetChrome: SheetChrome = {
  panelClassName:
    'sheet-panel fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[min(88dvh,760px)] max-w-[520px] flex-col overflow-hidden rounded-t-[var(--panel-radius)] border-t border-border bg-bg-raised outline-none sm:inset-x-3 sm:bottom-6 sm:rounded-[var(--panel-radius)] sm:border',
  Handle: null,
  CloseButton: MinimalSheetCloseButton,
  panelInClass: '',
  panelOutClass: '',
};

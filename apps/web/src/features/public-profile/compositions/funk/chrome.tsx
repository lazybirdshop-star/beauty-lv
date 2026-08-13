import * as Dialog from '@radix-ui/react-dialog';

import { useT } from '@/lib/i18n';

import type { SheetChrome } from '../../contracts/chrome';

/**
 * Закрытие мира — розовый квадрат с чернильным контуром (`.sheet-bar
 * button` файла). Объект маленький, поэтому зона нажатия доведена до
 * честных 44px псевдоэлементом.
 */
function FunkSheetCloseButton() {
  const t = useT();
  return (
    <Dialog.Close className='funk-press relative flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center border-2 border-solid border-ink bg-[var(--accent-to,var(--accent))] font-mono text-xs font-bold text-ink after:absolute after:-inset-2.5 after:content-[""] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'>
      <span aria-hidden="true">✕</span>
      <span className="sr-only">{t.common.close}</span>
    </Dialog.Close>
  );
}

/**
 * Хром шторки FUNK: лист земли с чернильным контуром, встающий в нижнюю
 * кромку. Скруглений нет ни одного, размытия под ним тоже — мир не знает
 * стекла, и гашение здесь плотная чернь (`.funk-overlay`).
 *
 * Ручки нет намеренно: её роль несёт чернильная полоса заголовка, которую
 * рисует сам `booking-sheet` (`.sheet-bar` файла). Брусок-ручка рядом с ней
 * был бы вторым носителем одного смысла — поэтому `Handle: null`, и токены
 * `--handle-*` мира равны нулю.
 */
export const sheetChrome: SheetChrome = {
  panelClassName:
    'sheet-panel fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[88dvh] max-w-[430px] flex-col overflow-hidden border-[length:var(--rule-width)] border-b-0 border-solid border-ink bg-bg outline-none lg:max-w-[580px] lg:shadow-[8px_8px_0_var(--ink)]',
  Handle: null,
  CloseButton: FunkSheetCloseButton,
  panelInClass: '',
  panelOutClass: '',
  overlayClassName: 'funk-overlay fixed inset-0 z-40',
};

import * as Dialog from '@radix-ui/react-dialog';

import { useT } from '@/lib/i18n';

import type { SheetChrome } from '../../contracts/chrome';
import { FOCUS_RING } from './ui';

/**
 * Закрытие этого мира — круглая кнопка с тонкой кромкой (`.sheet-close`
 * файла). Объект меньше иконко-кнопок шапки: он служебный, а не навигационный,
 * — но зона нажатия доведена до честных 44px псевдоэлементом.
 */
function AuraSheetCloseButton() {
  const t = useT();
  return (
    <Dialog.Close
      className={`aura-action relative flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-[color-mix(in_srgb,var(--surface-tint,var(--bg-raised))_70%,transparent)] text-ink-soft after:absolute after:-inset-[5px] after:content-[""] ${FOCUS_RING}`}
    >
      <span aria-hidden="true" className="text-xs leading-none">
        ✕
      </span>
      <span className="sr-only">{t.common.close}</span>
    </Dialog.Close>
  );
}

/**
 * Ручка шторки — капсула 44×5 (`.sheet-handle` файла). Продуктовая
 * `DefaultSheetHandle` красит брусок сплошным `--border-strong`; здесь ручка
 * мягче: чернь мира на 18%, ровно как в файле.
 */
function AuraSheetHandle() {
  return (
    <div
      className="mx-auto mb-0.5 mt-3 h-[var(--handle-height)] w-[var(--handle-width)] rounded-[var(--handle-radius)] bg-[color-mix(in_srgb,var(--ink)_18%,transparent)]"
      aria-hidden="true"
    />
  );
}

/**
 * Хром шторки AURA: стеклянный лист, встающий в нижнюю кромку экрана и
 * замыкающий верхние углы `--panel-radius` — силуэт `.sheet` файла.
 *
 * Материал тот же, что у всех поверхностей мира (`aura-veil`), с честным
 * фолбэком в сплошной `--bg-raised` без `backdrop-filter` и при
 * `prefers-reduced-transparency`. Движение токенизировано
 * (`sheet-panel` + `--anim-sheet-*`): выезд 550ms, уход 300ms — закон А2
 * соблюдён. Оверлей — `aura-overlay`: 35% черни плюс живое размытие 10px.
 */
export const sheetChrome: SheetChrome = {
  panelClassName:
    'sheet-panel aura-veil fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[min(88dvh,780px)] max-w-[430px] flex-col overflow-hidden rounded-t-[var(--panel-radius)] outline-none sm:max-w-[520px] lg:max-w-[580px]',
  Handle: AuraSheetHandle,
  CloseButton: AuraSheetCloseButton,
  panelInClass: '',
  panelOutClass: '',
  overlayClassName: 'aura-overlay fixed inset-0 z-40',
};

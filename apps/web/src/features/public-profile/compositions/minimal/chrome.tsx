import type { SheetChrome } from '../../contracts/chrome';
import { DefaultSheetHandle } from '../../shared/sheet-base';

/**
 * Хром шторки MINIMAL: лист земли, встающий в нижнюю кромку, со скруглённой
 * верхней парой углов 30px и без края — границу здесь несёт тень, как и у
 * всех поверхностей мира.
 *
 * Ручка на месте и она продуктовая: файл рисует ровно тот же брусок
 * 38×5 со скруглением (`.sheet-handle`), и токены `--handle-*` мира уже
 * несут эти размеры. Собственного компонента здесь заводить нечего.
 *
 * На развороте лист становится центрированной модалкой — это делает
 * `motion.css` продукта через `.sheet-panel`, а ширину задаёт кап ниже.
 */
export const sheetChrome: SheetChrome = {
  panelClassName:
    'sheet-panel fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[88dvh] max-w-[430px] flex-col overflow-hidden rounded-t-[var(--panel-radius)] bg-bg shadow-[0_-20px_60px_rgb(0_0_0/0.2)] outline-none lg:max-w-[560px]',
  Handle: DefaultSheetHandle,
  panelInClass: '',
  panelOutClass: '',
  overlayClassName: 'minimal-overlay fixed inset-0 z-40',
};

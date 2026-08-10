import type { SheetChrome } from '../../contracts/chrome';
import { defaultSheetChrome } from '../../shared/sheet-base';

/**
 * Хром шторки плакатного мира (§5): тот же продуктовый дефолт из
 * `components/ui/sheet.tsx` — шторка эталонных миров одна, их различие
 * читается через токены (`--panel-radius` у плаката — прямой угол).
 * Собственный хром появляется только у новых миров (M3+).
 */
export const sheetChrome: SheetChrome = defaultSheetChrome;

import type { SheetChrome } from '../../contracts/chrome';
import { defaultSheetChrome } from '../../shared/sheet-base';

/**
 * Хром шторки мягкого мира (§5): продуктовый дефолт, перенесённый из
 * `components/ui/sheet.tsx` без изменения разметки, — токенный брусок-ручка,
 * панель на `--panel-radius`/`--surface-shadow`, анимация на
 * токенизированных keyframes `--anim-sheet-in/out`. Собственный хром
 * появляется только у новых миров (M3+).
 */
export const sheetChrome: SheetChrome = defaultSheetChrome;

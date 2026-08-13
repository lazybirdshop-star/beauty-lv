import type { MotionSpec } from '../../contracts/chrome';

/**
 * Хореография MINIMAL как данные (§10).
 *
 * Пружин у мира нет: характер несёт кривая `--ease-style`
 * (`cubic-bezier(0.22, 0.9, 0.3, 1)` — `rise` файла), и этого достаточно.
 * Стоит ноль килобайт JS и работает на первом кадре SSR-выдачи.
 *
 * Сцены сменяются растворением с подъёмом: `crossfade` — то, как этот мир
 * меняет содержимое, и единственный честный вариант из контракта.
 */
export const motion: MotionSpec = {
  sheetInClass: 'sheet-panel-in',
  sheetOutClass: 'sheet-panel-out',
  stepTransition: 'crossfade',
};

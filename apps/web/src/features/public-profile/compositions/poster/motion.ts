import type { MotionSpec } from '../../contracts/chrome';

/**
 * Хореография плакатного мира как данные (§10). M2-фиксация текущего
 * поведения: вход/выход шторки — те же токенизированные продуктовые
 * keyframes (`--anim-sheet-in/out` → `sheet-panel-in/out`; характер
 * «editorial wipe / decisive» из матрицы §10 — цель, к которой мир идёт
 * отдельным шагом); шаги записи и месяц календаря сменяются мгновенным
 * срезом без переходного класса.
 */
export const motion: MotionSpec = {
  sheetInClass: 'sheet-panel-in',
  sheetOutClass: 'sheet-panel-out',
  stepTransition: 'none',
};

import type { MotionSpec } from '../../contracts/chrome';

/**
 * Хореография мягкого мира как данные (§10). M2-фиксация текущего
 * поведения: вход/выход шторки — токенизированные продуктовые keyframes
 * (`--anim-sheet-in/out` → `sheet-panel-in/out`, spring-подъём на 24px с
 * лёгким scale на кривой `--ease-style`); шаги записи и месяц календаря у
 * самого soft сменяются без переходного класса — `anim-luxury-fade` живёт
 * в тернарнике soft-дерева до M4 и к этому объекту не относится.
 */
export const motion: MotionSpec = {
  sheetInClass: 'sheet-panel-in',
  sheetOutClass: 'sheet-panel-out',
  stepTransition: 'none',
};

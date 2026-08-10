import type { MotionSpec } from '../../contracts/chrome';

/**
 * Хореография мягкого мира как данные (§10). M2-фиксация текущего
 * поведения: вход/выход шторки — токенизированные продуктовые keyframes
 * (`--anim-sheet-in/out` → `sheet-panel-in/out`, spring-подъём на 24px с
 * лёгким scale на кривой `--ease-style`); шаги записи и месяц календаря у
 * самого soft сменяются без переходного класса — `anim-minimal-crossfade` и
 * `anim-luxury-fade` живут в тернарниках soft-дерева до M3/M4 и к этому
 * объекту не относятся.
 */
export const motion: MotionSpec = {
  sheetInClass: 'sheet-panel-in',
  sheetOutClass: 'sheet-panel-out',
  stepTransition: 'none',
};

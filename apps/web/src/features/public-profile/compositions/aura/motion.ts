import type { MotionSpec } from '../../contracts/chrome';

/**
 * Хореография AURA как данные (§10).
 *
 * Пружин у мира нет, и это его характер, а не экономия: AURA дышит, а не
 * отпружинивает. Всё движение выражается кривой `--ease-style`
 * (`cubic-bezier(0.22, 0.9, 0.3, 1)` — вход файла `rise`), которая стоит
 * ноль килобайт JS и работает на первом кадре SSR-выдачи, до гидрации.
 *
 * Сцены сменяются растворением: шаги записи и месяцы календаря приходят
 * подъёмом с opacity — тем же жестом, которым приходит любая секция мира.
 */
export const motion: MotionSpec = {
  sheetInClass: 'sheet-panel-in',
  sheetOutClass: 'sheet-panel-out',
  stepTransition: 'crossfade',
};

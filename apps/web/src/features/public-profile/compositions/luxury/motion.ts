import type { MotionSpec } from '../../contracts/chrome';

/**
 * Хореография Luxury («Bergs») как данные (§10). Вход и выход шторки —
 * токенизированные продуктовые keyframes (`sheet-panel-in/out`), но
 * значения токенов у этого мира свои: подъём на 40px за 520ms по
 * кривой-шторе, уход за 280ms, без scale в обе стороны (`--sheet-y: 40px`,
 * `--sheet-scale: 1`); гашение чернью 35% за 420/240ms — rgba(32,26,20,.35)
 * макета. Шаги записи и месяц календаря сменяются медленным fade 500ms —
 * класс `anim-luxury-fade` живёт в `motion.css` этого мира и едет с его
 * чанком. Ни одной пружины: вес набирается временем, не амплитудой.
 */
export const motion: MotionSpec = {
  sheetInClass: 'sheet-panel-in',
  sheetOutClass: 'sheet-panel-out',
  stepTransition: 'fade',
};

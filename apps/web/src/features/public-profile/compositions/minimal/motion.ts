import type { MotionSpec } from '../../contracts/chrome';

/**
 * Хореография Minimal как данные (§10, BRAND_STYLES.md §6). Вход и выход
 * шторки — токенизированные продуктовые keyframes (`sheet-panel-in/out`),
 * но значения токенов у этого мира свои: подъём на 24px за 220ms, уход за
 * 140ms, без scale в обе стороны; гашение чернью 40% за 160/120ms без blur.
 * Шаги записи и месяц календаря сменяются crossfade 120ms — класс
 * `anim-minimal-crossfade` живёт в `motion.css` этого мира и едет с его
 * чанком. Ни одной пружины: мир отвечает, а не анимируется.
 */
export const motion: MotionSpec = {
  sheetInClass: 'sheet-panel-in',
  sheetOutClass: 'sheet-panel-out',
  stepTransition: 'crossfade',
};

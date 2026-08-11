/**
 * Словарь классов мира Neo Glass (BRAND_STYLES.md §9): стекло — архитектура,
 * а не приём. Материал один (`neo-glass-pane` из `motion.css`), геометрий
 * много — капсулы, непрерывные углы, круги; поэтому здесь собраны готовые
 * пары «материал + форма», чтобы кнопка записи на календаре, в прайсе и в
 * шторке была одной и той же кнопкой.
 *
 * Свечения-glow нет ни в одной строке: свет набирается насыщенностью
 * бирюзы на тёмном поле и бликом, а не тенью (закон §8 DESIGN_SYSTEM).
 */

/* Фокус-кольцо мира: бирюза с отступом от тёмной земли — одно правило на
   все контролы, чтобы кольцо не тонуло в стекле. */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

/* Внутреннее кольцо — для контролов, сидящих внутри стеклянного листа, где
   внешний отступ вырезал бы кромку соседа. */
export const FOCUS_RING_INSET =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent';

/* Primary — бирюзовая капсула с глубоким текстом. Материал под заливкой —
   то же стекло, что у остальных объектов мира (кромка, блик, тень), потому
   что недоступная кнопка обязана остаться видимым объектом: заливка
   снимается, стекло под ней остаётся. Hover подводит подъём и тень
   (`neo-glass-lift`), press — `scale(0.96)` с пружинным возвратом. */
export const PRIMARY_BUTTON_CLASS = `action-fill neo-glass-pane neo-glass-action neo-glass-lift inline-flex h-13 cursor-pointer items-center justify-center gap-2 rounded-[var(--control-radius)] text-[15px] font-semibold hover:bg-[var(--accent-hover)] ${FOCUS_RING} disabled:pointer-events-none disabled:bg-[color-mix(in_srgb,var(--bg-raised)_55%,transparent)] disabled:text-ink-faint`;

/* Secondary — стеклянная капсула: кромка плюс подложка (§9 «Кнопки»). */
export const SECONDARY_BUTTON_CLASS = `neo-glass-pane neo-glass-action neo-glass-lift inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--control-radius)] text-[14px] font-medium text-ink ${FOCUS_RING} disabled:pointer-events-none disabled:opacity-50`;

/* Круглая иконка-кнопка меты: 44px честной зоны, стекло, световая кромка. */
export const ICON_BUTTON_CLASS = `neo-glass-pane neo-glass-action neo-glass-lift flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink ${FOCUS_RING}`;

/* Служебная подпись мира: капс 11px с трекингом 0.08em (§9 «Типографика»). */
export const LABEL_CLASS = 'text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint';

/* Горизонтальные поля страницы — 20px по кадру референса: плотный
   «островной» ритм, воздуха между блоками меньше, чем в светлых мирах. */
export const PAGE_X = 'px-5';

/* Шаг каскада материализации, в миллисекундах (`--stagger-step`, §9 —
   45ms сверху вниз). Разметка раздаёт его как `animation-delay`, потому
   что CSS не умеет считать порядковый номер узла. */
export const STAGGER_MS = 45;

/** Задержка каскада для узла с порядковым номером `index`. */
export function cascade(index: number): { animationDelay: string } {
  return { animationDelay: `${index * STAGGER_MS}ms` };
}

/**
 * Словарь классов мира AURA (`aura.html`): материал один — перламутровое
 * стекло, — а форм в мире две, круг и капсула. Здесь собраны готовые пары
 * «материал + форма», чтобы кнопка записи на календаре, в прайсе и в шторке
 * была одной и той же кнопкой.
 */

/* Фокус-кольцо мира: акцент с отступом от перламутра — одно правило на все
   контролы, чтобы кольцо не тонуло в стекле. */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

/* Внутреннее кольцо — для контролов внутри стеклянного листа, где внешний
   отступ вырезал бы кромку соседа. */
export const FOCUS_RING_INSET =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent';

/*
 * Главное действие — лента градиента (`--grad` файла), а не заливка.
 *
 * `.action-fill` здесь намеренно нет: он красит фон одним `--action-bg`, и
 * мир, у которого действие это два цвета, отвечал бы им одним. Цвет надписи
 * при этом берётся из того же токена, что и во всех мирах
 * (`--action-ink`) — резолвер выбирает его так, чтобы норму проходили **оба**
 * конца ленты, а не средний между ними.
 */
export const PRIMARY_BUTTON_CLASS = `aura-grad aura-action inline-flex h-13 cursor-pointer items-center justify-center gap-2 rounded-[var(--control-radius)] text-[15px] font-semibold text-[var(--action-ink)] shadow-[0_18px_36px_-14px_color-mix(in_srgb,var(--accent)_60%,transparent)] ${FOCUS_RING} disabled:pointer-events-none disabled:bg-none disabled:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] disabled:text-ink-faint disabled:shadow-none`;

/* Второе действие — стеклянная капсула (`.slot-btn` файла): тот же материал,
   что у листов, надпись чернью мира. */
export const SECONDARY_BUTTON_CLASS = `aura-veil aura-action inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--control-radius)] text-[14px] font-semibold text-ink ${FOCUS_RING} disabled:pointer-events-none disabled:opacity-50`;

/* Круглая иконка-кнопка шапки: 38px по кадру файла, но зона нажатия
   доведена до честных 44px псевдоэлементом — размер объекта и размер цели
   это два разных решения. */
export const ICON_BUTTON_CLASS = `aura-veil aura-action relative flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full text-ink after:absolute after:-inset-[3px] after:content-[""] ${FOCUS_RING}`;

/* Служебная подпись мира: капс 10px с широким трекингом — `.slot-label` и
   `.plate-title` файла набраны именно так. */
export const LABEL_CLASS = 'text-[10px] font-medium uppercase tracking-[0.3em] text-ink-faint';

/* Заголовок раздела: тонкое дисплейное начертание, акцентный слог внутри
   берёт градиент — приём `h2 b` файла. */
export const HEADING_CLASS =
  'font-display text-[22px] leading-tight tracking-[var(--display-tracking)] [font-weight:var(--display-weight)] text-ink';

/*
 * Кольцо орба — `--hero-bg` файла: переливающийся конический градиент из
 * пастелей авроры.
 *
 * Одна константа на два места, где орб появляется: шапка и успех записи.
 * Это подпись мира, а не ручка мастера — в шапке `aura.html` изменяемым
 * назван кадр внутри кольца (фото), а не само кольцо.
 */
export const ORB_RING = 'conic-gradient(from 200deg, #F3C6D0, #DDD2F4, #CBDDF2, #D6EBDD, #F3C6D0)';

/* Шаг каскада входа, в миллисекундах (`--stagger-step`). Разметка раздаёт
   его как `animation-delay`, потому что CSS не умеет считать порядковый
   номер узла. */
export const STAGGER_MS = 70;

/** Задержка каскада для узла с порядковым номером `index`. */
export function cascade(index: number): { animationDelay: string } {
  return { animationDelay: `${index * STAGGER_MS}ms` };
}

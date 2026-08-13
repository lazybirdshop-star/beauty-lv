/**
 * Словарь классов мира MINIMAL (`minimal.html`): один материал — белая
 * карточка, поднятая длинной мягкой тенью, — и ни одного прямого угла.
 *
 * Мир не знает ни контуров, ни капса, ни второй краски: всё, чем он
 * говорит, это воздух, вес шрифта и один синий.
 */

/* Фокус-кольцо: синее, с отступом от земли — единственная краска мира. */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

export const FOCUS_RING_INSET =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent';

/*
 * Главное действие — сплошная капсула 54px с длинной цветной тенью
 * (`.cta-btn.ready` файла). Неготовое состояние не серая копия готового, а
 * другой объект: плоская подложка без тени, как в файле.
 */
export const PRIMARY_BUTTON_CLASS = `min-press inline-flex h-[54px] cursor-pointer items-center justify-center gap-2 rounded-[var(--control-radius)] bg-[var(--action-bg)] px-6 text-base font-semibold tracking-[-0.02em] text-[var(--action-ink)] shadow-[0_16px_34px_-12px_color-mix(in_srgb,var(--accent)_55%,transparent)] ${FOCUS_RING} disabled:pointer-events-none disabled:bg-bg-sunken disabled:text-ink-soft disabled:shadow-none`;

/* Второе действие — подложка `--fill` с синей надписью (`.slot-btn`). */
export const SECONDARY_BUTTON_CLASS = `min-press inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--control-radius)] bg-bg-sunken px-5 text-sm font-semibold tracking-[-0.02em] text-accent ${FOCUS_RING} disabled:pointer-events-none disabled:text-ink-soft disabled:opacity-60`;

/* Иконко-кнопка шапки: круг 36px на подложке `--fill`, зона нажатия 44px. */
export const ICON_BUTTON_CLASS = `min-press relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-sunken text-ink after:absolute after:-inset-1 after:content-[""] ${FOCUS_RING}`;

/* Служебная подпись: 12.5px, полужирная, приглушённая — `.slot-label`. */
export const LABEL_CLASS = 'text-[12.5px] font-semibold tracking-[-0.01em] text-ink-soft';

/* Заголовок раздела: 27px, вес 700, плотный трекинг — `.sec-title`. */
export const HEADING_CLASS =
  'font-display text-[27px] font-bold tracking-[-0.035em] text-ink lg:text-[30px]';

/* Приписка справа от заголовка: синяя, мелкая — вторая половина `.sec-title`. */
export const HEADING_NOTE_CLASS = 'text-sm font-medium tracking-[-0.01em] text-accent';

/* Живая точка: зелёная, в ореоле. Статусный цвет неприкосновенен в любом
   мире, поэтому она красится `--success`, а не акцентом. */
export const LIVE_DOT_CLASS =
  'h-[7px] w-[7px] shrink-0 rounded-full bg-success shadow-[0_0_0_4px_color-mix(in_srgb,var(--success)_18%,transparent)]';

/* Шаг каскада входа, в миллисекундах (`--stagger-step`). */
export const STAGGER_MS = 50;

/** Задержка каскада для узла с порядковым номером `index`. */
export function cascade(index: number): { animationDelay: string } {
  return { animationDelay: `${index * STAGGER_MS}ms` };
}

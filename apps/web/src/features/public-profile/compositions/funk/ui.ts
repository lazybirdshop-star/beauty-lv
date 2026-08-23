/**
 * Словарь классов мира FUNK (`brutal.html`): один материал — белый блок с
 * чернильным контуром и жёсткой тенью, — и ни одного скругления.
 */

/* Фокус-кольцо: розовое, с отступом от земли. Розовый здесь не текст, а
   поле, поэтому кольцо им и красится — оно и есть поле. */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-to,var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

export const FOCUS_RING_INSET =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-to,var(--accent))]';

/*
 * Главное действие — чернильный блок с лаймовой надписью и **розовой**
 * тенью (`.cta-btn.ready` файла). Тень второго акцента здесь несёт смысл:
 * она отличает готовое действие от неготового, у которого тени нет вовсе.
 */
/*
 * Надпись — акцентом, а не `--action-ink`.
 *
 * `--action-ink` — это краска, читаемая *поверх акцента*, и в мирах, где
 * кнопка залита акцентом (мягкий, AURA, минимал), она верна. Здесь кнопка
 * залита чернью — брутализм красит действие негативом, — и та же переменная
 * давала чернь по черни: контраст 1:1, надписи не видно вовсе. Негатив у
 * этого мира уже описан правилом выбранной строки (`bg-ink text-accent`),
 * и кнопка обязана ему следовать.
 */
export const PRIMARY_BUTTON_CLASS = `funk-press inline-flex h-14 cursor-pointer items-center justify-center gap-2 border-[length:var(--rule-width)] border-solid border-ink bg-ink text-[12.5px] font-bold uppercase tracking-[0.18em] text-accent shadow-[5px_5px_0_var(--accent-to,var(--accent))] ${FOCUS_RING} disabled:pointer-events-none disabled:bg-[color-mix(in_srgb,var(--ink)_12%,var(--bg))] disabled:text-ink-faint disabled:shadow-none`;

/* Второе действие — белый блок с чернильной надписью (`.slot-btn`). */
export const SECONDARY_BUTTON_CLASS = `funk-block funk-press inline-flex cursor-pointer items-center justify-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.18em] text-ink ${FOCUS_RING} disabled:pointer-events-none disabled:opacity-45`;

/* Иконко-кнопка шапки: 40px по кадру файла, зона нажатия доведена до 44px. */
export const ICON_BUTTON_CLASS = `funk-block funk-press relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center text-ink after:absolute after:-inset-0.5 after:content-[""] ${FOCUS_RING}`;

/* Служебная подпись: моноширинный капс с широким трекингом. */
export const LABEL_CLASS =
  'font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint';

/* Метка-стикер: розовое поле с чернильной надписью, посаженное под углом.
   Наклон — подпись мира, и он же причина, по которой метка не может нести
   длинный текст: два слова максимум. */
export const STICKER_CLASS =
  'inline-block border-[length:var(--rule-width)] border-solid border-ink bg-[var(--accent-to,var(--accent))] px-3 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink shadow-[3px_3px_0_var(--ink)]';

/* Заголовок раздела: дисплейный 900 капсом, второй слог обводкой. */
export const HEADING_CLASS =
  'font-display text-2xl font-black uppercase tracking-[var(--display-tracking)] text-ink';

/* Шаг каскада входа, в миллисекундах (`--stagger-step`). */
export const STAGGER_MS = 40;

/** Задержка каскада для узла с порядковым номером `index`. */
export function cascade(index: number): { animationDelay: string } {
  return { animationDelay: `${index * STAGGER_MS}ms` };
}

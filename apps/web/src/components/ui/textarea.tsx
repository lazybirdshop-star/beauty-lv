import type { TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Высоту задаёт `rows`, а не `min-height`.
 *
 * Было `min-h-24` — 96px, из которых 24 съедают поля и 2 рамка: на строку в
 * 24px оставалось 70, то есть две строки целиком и третья пополам. На телефоне
 * описание мастера упиралось ровно в этот обрезок, и текст выглядел
 * подрезанным по горизонтали — самый дешёвый способ показать, что вёрстку
 * никто не мерил.
 *
 * `rows` — ответ самой платформы: браузер считает высоту от строки, поэтому
 * она кратна ей по определению и остаётся кратной при любом кегле и любом
 * шрифте. `leading-6` пишется явно, чтобы строка была той же величины, от
 * которой считаются все прочие вертикальные ритмы формы.
 *
 * Ниша та же, что у `Input`: заливка, рамка и кегль — токенами мира.
 */
export function Textarea({
  className,
  rows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={rows}
      className={cn(
        /* Тянется только вниз. По умолчанию браузер даёт обе оси, и поле
           описания растягивалось за край карточки, ломая колонку формы;
           вертикаль — то, чего описанию действительно не хватает. */
        'resize-y rounded-[var(--field-radius)] border-[length:var(--field-border-width,1px)] border-border-strong bg-[var(--field-bg,var(--bg-raised))] px-3.5 py-3 text-[length:var(--field-font,1rem)] leading-6 text-ink outline-none placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-bg',
        className,
      )}
      {...props}
    />
  );
}

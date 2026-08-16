'use client';

import type { PageDesign } from '@amolie/shared-kernel';

import { WorldThumbnail } from '@/features/public-profile/registry/world-thumbnail';
import { cn } from '@/lib/utils';

/**
 * Карточка мира в каталоге и в галерее: живая миниатюра плюс имя и обещание.
 *
 * **Нажатие несёт наложенная кнопка, а не сама карточка.** Миниатюра — это
 * настоящий мир, собранный тем же реестром, и внутри неё живут кнопки мира:
 * запись, листание месяца, услуги. Кнопка внутри кнопки — невалидный HTML, и
 * React честно ругался ошибкой гидратации на каждой карточке каталога.
 * Растянутая кнопка поверх карточки решает это без вложенности: зона нажатия
 * та же самая, фокус один, а разметка законна.
 */
export function WorldCard({
  design,
  name,
  description,
  selected,
  height,
  onSelect,
  onPreview,
  onPreviewEnd,
}: {
  design: PageDesign;
  name: string;
  description?: string;
  selected: boolean;
  height: number;
  onSelect: () => void;
  /** Наведение примеряет мир на холсте, не фиксируя его (§3.3). */
  onPreview?: () => void;
  onPreviewEnd?: () => void;
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-1.5 p-2 transition-colors duration-[var(--dur-hover)]',
        selected ? 'bg-bg-sunken' : 'bg-bg-raised',
      )}
    >
      {/* Выбранный мир отмечен полосой акцента — той же меткой, что несёт
          активный раздел кабинета. Рамки вокруг карточки нет: обведённый
          блок в системе AMOLIE считается дефектом. */}
      {selected ? (
        <span aria-hidden="true" className="absolute inset-x-0 top-0 z-10 h-[2px] bg-accent" />
      ) : null}

      <WorldThumbnail design={design} height={height} />

      <span className="px-1 pb-1">
        <span className={cn('block text-sm', selected ? 'text-ink' : 'text-ink-soft')}>{name}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-faint">{description}</span>
        ) : null}
      </span>

      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        onMouseEnter={onPreview}
        onMouseLeave={onPreviewEnd}
        onFocus={onPreview}
        onBlur={onPreviewEnd}
        className="press absolute inset-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent hover:bg-ink/[0.03]"
      >
        <span className="sr-only">{name}</span>
      </button>
    </div>
  );
}

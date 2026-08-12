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
        'relative flex flex-col gap-1.5 rounded-3xl border-2 p-2 transition-colors duration-[var(--dur-hover)]',
        selected ? 'border-accent bg-accent-soft' : 'border-border',
      )}
    >
      <WorldThumbnail design={design} height={height} />

      <span className="px-1 pb-1">
        <span className="block text-sm font-semibold text-ink">{name}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{description}</span>
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
        className="press absolute inset-0 cursor-pointer rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent hover:bg-ink/[0.03]"
      >
        <span className="sr-only">{name}</span>
      </button>
    </div>
  );
}

import type { PublicService } from '../engine/types';
import { cn } from '@/lib/utils';

/**
 * Снимок услуги в ведущем месте строки.
 *
 * Правило одно на все шесть миров: если у услуги есть фотография — стоит она,
 * если нет — собственная метка мира (цветная точка у AURA, номер у FUNK,
 * ничего у Minimal). Слот при этом остаётся один, поэтому строки с фотографией
 * и без неё держат общую сетку.
 *
 * `<img>`, а не `next/image`: адрес мастер вставляет свой, любой, и открывать
 * оптимизатор Next произвольному хосту нельзя — то же решение, что уже принято
 * в прайс-листах мягкого, плакатного и роскошного миров.
 *
 * Размер и скругление задаёт мир: у стекла они одни, у брутализма другие, и
 * общего значения тут быть не может. Общее — сам факт, что фотография занимает
 * это место.
 */
export function ServiceThumb({
  service,
  className,
  fallback = null,
}: {
  service: PublicService;
  /** Габарит и скругление — от мира. */
  className: string;
  /** Метка мира, когда фотографии нет. */
  fallback?: React.ReactNode;
}) {
  if (!service.imageUrl) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- произвольный адрес мастера
    <img
      src={service.imageUrl}
      alt=""
      loading="lazy"
      className={cn('shrink-0 object-cover', className)}
    />
  );
}

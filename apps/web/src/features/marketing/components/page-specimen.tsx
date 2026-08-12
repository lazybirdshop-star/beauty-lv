import Image from 'next/image';

/**
 * Страница мастера в телефоне — «фотография» этого лендинга.
 *
 * Снимок настоящего экрана продукта, а не нарисованный макет: доказательство
 * должно быть тем, что существует. Через `next/image` — это наш собственный
 * файл в сборке, а не произвольная ссылка мастера, для которой оптимизатор
 * закрыт (DESIGN.md).
 *
 * Текст внутри снимка растровый и на другом языке не меняется — решение
 * пользователя, принятое сознательно: снимок показывает вид страницы, а не
 * читается как копирайт.
 */
export function PageSpecimen() {
  return (
    <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[340px]">
      <Image
        src="/brand/hero-app.png"
        alt=""
        aria-hidden="true"
        width={756}
        height={1520}
        priority
        sizes="(min-width: 768px) 340px, 300px"
        className="h-auto w-full rounded-[28px] shadow-[0_40px_80px_-32px_rgba(22,19,15,0.45)]"
      />
    </div>
  );
}

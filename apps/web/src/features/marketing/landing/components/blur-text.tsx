/* Adapted from React Bits — TextAnimations/BlurText (MIT, DavidHDev/react-bits).
   Reworked to animate word by word *inside lines the author breaks manually*
   (AI-RULES BRK-04), instead of letting the words rewrap on their own.

   Приход набран на CSS, а не на библиотеке анимации, и это не вкусовщина.
   Через `motion` начальное состояние слова — нулевая непрозрачность и блюр —
   попадает в серверную разметку инлайном, а снимается оно только после того,
   как приедет и отработает гидратация. На телефоне по мобильной сети это
   секунды, в которые заголовок первого экрана просто отсутствует: подпись и
   кнопка рядом приходят как раз на CSS и видны сразу, а самая крупная строка
   на странице — нет. Ключевые кадры те же, лестница задержек та же, но
   держит их браузер, и первый кадр уже с текстом. */
import type { CSSProperties } from 'react';
import { useMemo } from 'react';

type BlurTextProps = {
  /** Each entry is one rendered line. Breaks are the author's, never automatic. */
  lines: string[];
  className?: string;
  lineClassName?: string;
  /** ms between consecutive words */
  delay?: number;
  /** ms before the first word moves */
  startDelay?: number;
  /** длительность прихода одного слова, с */
  stepDuration?: number;
};

export function BlurText({
  lines,
  className,
  lineClassName,
  delay = 45,
  startDelay = 0,
  stepDuration = 0.42,
}: BlurTextProps) {
  const words = useMemo(() => lines.map((line) => line.split(' ')), [lines]);

  /* Лестница задержек считается один раз на все строки: слово во второй
     строке продолжает счёт первой, иначе обе строки стартуют вместе и
     ступенька, ради которой всё и затевалось, пропадает. */
  const offsets = useMemo(
    () => words.reduce<number[]>((acc, line, i) => [...acc, (acc[i] ?? 0) + line.length], [0]),
    [words],
  );

  return (
    <span className={className}>
      {lines.map((_, li) => (
        <span className={lineClassName} key={li}>
          {(words[li] ?? []).map((word, wi) => (
            <span
              className="word-in"
              key={`${li}-${wi}`}
              style={
                {
                  '--d': `${startDelay + ((offsets[li] ?? 0) + wi) * delay}ms`,
                  '--dur': `${stepDuration * 2}s`,
                } as CSSProperties
              }
            >
              {word}
              {/* Пробел неразрывный и внутри слова: оно набрано отдельным
                  inline-block, а обычный пробел в конце строчного блока браузер
                  отбрасывает — слова слипаются.

                  Последнему слову строки пробел не достаётся, и это не мелочь.
                  Неразрывный не схлопывается никогда и входит в ширину строки,
                  а строка центрована: лишняя четверть кегля в её конце уводит
                  заголовок влево от середины на половину этой четверти. На
                  восьми ремах это полтора десятка пикселей, и видно их на всех
                  трёх языках сразу. */}
              {wi < (words[li]?.length ?? 0) - 1 ? ' ' : ''}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

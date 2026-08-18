/* Adapted from React Bits — TextAnimations/BlurText (MIT, DavidHDev/react-bits).
   Reworked to animate word by word *inside lines the author breaks manually*
   (AI-RULES BRK-04), instead of letting the words rewrap on their own. */
import { motion } from 'motion/react';
import { useMemo } from 'react';

type Snapshot = Record<string, string | number>;

const buildKeyframes = (from: Snapshot, steps: Snapshot[]) => {
  const keys = new Set([...Object.keys(from), ...steps.flatMap((s) => Object.keys(s))]);
  const keyframes: Record<string, Array<string | number>> = {};
  keys.forEach((k) => {
    keyframes[k] = [from[k], ...steps.map((s) => s[k])] as Array<string | number>;
  });
  return keyframes;
};

type BlurTextProps = {
  /** Each entry is one rendered line. Breaks are the author's, never automatic. */
  lines: string[];
  className?: string;
  lineClassName?: string;
  /** ms between consecutive words */
  delay?: number;
  /** ms before the first word moves */
  startDelay?: number;
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
  const from: Snapshot = useMemo(() => ({ filter: 'blur(14px)', opacity: 0, y: 28 }), []);
  const to: Snapshot[] = useMemo(
    () => [
      { filter: 'blur(7px)', opacity: 0.45, y: 8 },
      { filter: 'blur(0px)', opacity: 1, y: 0 },
    ],
    [],
  );

  const keyframes = useMemo(() => buildKeyframes(from, to), [from, to]);
  const times = [0, 0.5, 1];

  /* Лестница задержек считается один раз на все строки: слово во второй
     строке продолжает счёт первой, иначе обе строки стартуют вместе и
     ступенька, ради которой всё и затевалось, пропадает. Смещение выведено
     из уже разобранных строк, а не накоплено переменной по ходу отрисовки —
     повторный рендер обязан дать те же числа. */
  const words = useMemo(() => lines.map((line) => line.split(' ')), [lines]);
  const offsets = useMemo(
    () => words.reduce<number[]>((acc, line, i) => [...acc, (acc[i] ?? 0) + line.length], [0]),
    [words],
  );

  return (
    <span className={className}>
      {words.map((line, li) => (
        <span className={lineClassName} key={li}>
          {line.map((word, wi) => {
            const d = startDelay + ((offsets[li] ?? 0) + wi) * delay;
            return (
              <motion.span
                key={`${li}-${wi}`}
                style={{ display: 'inline-block', willChange: 'transform, filter, opacity' }}
                initial={from}
                animate={keyframes}
                transition={{
                  duration: stepDuration * 2,
                  times,
                  delay: d / 1000,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {word}
                {/* Неразрывный, а не обычный: слово живёт в отдельном
                    inline-block, а обычный пробел в конце строчного
                    блока браузер отбрасывает — слова слипаются. */}
                {'\u00A0'}
              </motion.span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

/**
 * Имя для узкой колонки: «Viktorija Sokolova» → «Viktorija S.».
 *
 * В командном дне и в неделе на колонку приходится около 250 px, и полное имя
 * уходило в многоточие посреди фамилии — «Viktorija Sokolo…» (критика
 * 2026-09-24). Обрезанное имя не называет человека и не помогает его узнать, а
 * инициал называет.
 *
 * Имя из одного слова остаётся как есть: сокращать нечего. Третье и дальше
 * слова отбрасываются — в колонке им всё равно нет места.
 */
export function shortClientName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? '';
  const [first, second] = parts;
  const initial = [...second!][0];
  return initial ? `${first} ${initial.toLocaleUpperCase()}.` : first!;
}

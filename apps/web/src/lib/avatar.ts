/**
 * Кружок с инициалами — то, что стоит вместо фотографии во всех таблицах
 * макета.
 *
 * Одна функция на весь кабинет: до этого она была скопирована в пяти файлах, и
 * шестая копия отличалась запасной буквой. Инициалы — часть того, как человек
 * узнаёт строку, и расходиться между экранами они не имеют права.
 */
export function initials(name: string, fallback = '?'): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || fallback
  );
}

/**
 * Шесть тонов подложки из артбордов панели платформы.
 *
 * Цвет не значит ничего — он только помогает глазу отличить строку от соседней
 * при быстрой прокрутке. Поэтому он берётся из имени, а не из статуса: строка
 * обязана выглядеть одинаково при любом отборе и на любой странице, а статус
 * уже назван словом в своей колонке.
 */
const TINTS = [
  { background: '#f8e1e9', color: '#b7396c' },
  { background: '#ece6fa', color: '#7d67bd' },
  { background: '#e1efe6', color: '#3f7d5a' },
  { background: '#fbefd6', color: '#a9701a' },
  { background: '#e4edf5', color: '#3d6a93' },
  { background: '#f0ebe5', color: '#262529' },
] as const;

export function avatarTint(seed: string): { background: string; color: string } {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1_000_003;
  }
  return TINTS[hash % TINTS.length]!;
}

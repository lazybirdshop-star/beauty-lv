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
 * Подложка инициалов — один нейтральный тон на весь кабинет.
 *
 * Шесть цветных тонов панели платформы ушли: цвет в Design System V2
 * принадлежит услуге, а не человеку (правило 02), и радуга кружков спорила
 * бы с полосами услуг за внимание. Токены, а не hex, — тёмная тема получает
 * свой тон сама.
 */
const NEUTRAL_TINT = { background: 'var(--bg-sunken)', color: 'var(--ink-soft)' } as const;

export function avatarTint(_seed: string): { background: string; color: string } {
  return NEUTRAL_TINT;
}

/**
 * Тон услуги — цвет полосы времени (правило 02 Design System V2).
 *
 * Четыре тёплых взрослых тона, не леденцы: dusty rose, sage, clay, slate.
 * Возвращается **токен**, а не hex: тёмная тема красит полосы сама, и один
 * тон в двух темах измерен в `tokens.test.ts` (≥ 3:1 на нише).
 *
 * У услуги в базе есть своё поле `color` (выбор мастера), но позиции визита
 * несут только снимок имени и цены — цвет до календаря не доезжает. Пока
 * это так, тон считается из идентификатора услуги: постоянный у одной и
 * разный у соседних, — ровно то, ради чего полоса существует.
 */
export const SERVICE_TONES = [
  'var(--service-rose)',
  'var(--service-sage)',
  'var(--service-clay)',
  'var(--service-slate)',
] as const;

export type ServiceTone = (typeof SERVICE_TONES)[number];

export function serviceTone(id: string): ServiceTone {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return SERVICE_TONES[hash % SERVICE_TONES.length]!;
}

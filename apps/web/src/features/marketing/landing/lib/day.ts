/**
 * Один день — вторник, 9 сентября, Studio Nara.
 *
 * Каждый календарь на странице — окно в этот день, а не собственный набор
 * выдумок. Так гарантируется то, ради чего мокапы вообще стоят на лендинге:
 * герой, секция «Проблема», сравнение соло и салона и финальный экран
 * показывают одно и то же расписание с разных сторон, и читатель, который
 * пролистал страницу целиком, не ловит продукт на противоречии.
 *
 * Имена людей и названия услуг здесь не переводятся: это слова
 * вымышленного салона, а не интерфейс продукта (см. правило словаря в
 * `lib/i18n/messages.ts`). Переводится всё, что рисует продукт, — подписи
 * колонок, кнопки, ярлыки.
 */

/** Мастер в мокапе: имя, инициалы и тон карточки в календаре. */
export type Person = {
  name: string;
  initials: string;
  /** Модификатор `.avatar` — задаёт цвет кружка. */
  avatarTone: string;
  /** Модификатор `.appt` — задаёт тон карточек этого мастера. */
  apptTone: string;
};

export const PEOPLE = {
  elina: { name: 'Elīna', initials: 'EO', avatarTone: '', apptTone: '' },
  marta: { name: 'Marta', initials: 'MK', avatarTone: 'avatar--pink', apptTone: 'appt--pink' },
  ruta: { name: 'Rūta', initials: 'RB', avatarTone: 'avatar--paper', apptTone: 'appt--ink' },
  toms: { name: 'Toms', initials: 'TL', avatarTone: 'avatar--ink', apptTone: 'appt--ink' },
  anna: { name: 'Anna', initials: 'AL', avatarTone: '', apptTone: '' },
  janis: { name: 'Jānis', initials: 'JR', avatarTone: 'avatar--pink', apptTone: 'appt--pink' },
} satisfies Record<string, Person>;

export type PersonKey = keyof typeof PEOPLE;

/** `'09:30'` → 9.5. Календарь считает в часах, потому что в них же меряет высоту. */
export function toHours(time: string): number {
  const [h = '0', m = '0'] = time.split(':');
  return Number(h) + Number(m) / 60;
}

/** 9.5 → `'09:30'`. Обратная операция для подписи «начало–конец». */
export function toClock(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Запись в мокапе календаря. */
export type Appointment = {
  /** Индекс колонки — какому мастеру она принадлежит. */
  col: number;
  at: string;
  /** Длительность в минутах. */
  minutes: number;
  service?: string;
  client?: string;
  /** Свободное окно вместо записи. */
  free?: boolean;
  /** Дополнительный модификатор `.appt` — например, только что созданная запись. */
  tone?: string;
  /**
   * Задержка появления карточки, мс. Ставится только там, где расписание
   * собирается на глазах у читателя — в первом экране; в остальных пяти
   * календарях день нарисован сразу и целиком.
   */
  popDelayMs?: number;
};

type DayEntry = [
  at: string,
  minutes: number,
  service: string | null,
  client?: string,
  tone?: string,
];

const DAY: Record<PersonKey, DayEntry[]> = {
  elina: [
    ['09:30', 75, 'Gel manicure', 'Kristīne J.'],
    ['11:00', 45, 'Classic manicure', 'Dana K.'],
    ['12:30', 60, 'Lash lift', 'Ilze L.'],
    ['14:30', 75, 'Gel manicure', 'Laura V.', 'appt--new'],
  ],
  marta: [
    ['10:00', 30, 'Brow shaping', 'Anete S.'],
    ['11:00', 75, 'Gel manicure', 'Marija P.'],
    ['13:00', 45, 'Classic manicure', 'Elza R.'],
    ['14:30', 30, 'Brow tint', 'Zane B.'],
  ],
  ruta: [
    ['09:00', 60, 'Lash extensions', 'Alise M.'],
    ['10:30', 30, 'Brow shaping', 'Liene D.'],
    ['12:00', 90, 'Lash refill', 'Sanita O.'],
    ['14:00', 60, 'Lash lift', 'Kate P.'],
    ['15:30', 60, 'Lash lift', 'Liene D.'],
  ],
  toms: [
    ['09:00', 45, 'Haircut', 'Mārtiņš R.'],
    ['10:00', 30, 'Beard trim', 'Toms B.'],
    ['11:00', 50, 'Skin fade', 'Emīls K.'],
    ['13:00', 45, 'Haircut', 'Rihards A.'],
  ],
  anna: [
    ['10:00', 120, 'Balayage', 'Līga S.'],
    ['12:30', 20, 'Color consult.', 'Zane B.'],
    ['13:30', 60, 'Haircut & style', 'Agnese V.'],
  ],
  janis: [
    ['09:30', 45, 'Haircut', 'Kārlis O.'],
    ['11:00', 75, 'Haircut + beard', 'Roberts M.'],
    ['13:00', 60, null],
  ],
};

/**
 * Срез дня: только те записи выбранных мастеров, которые целиком помещаются
 * в окно `start…end`. Обрезанная наполовину карточка в мокапе читается как
 * ошибка вёрстки, а не как «день продолжается».
 */
export function dayAppointments(
  columns: readonly PersonKey[],
  start: number,
  end: number,
  extra: Appointment[] = [],
): Appointment[] {
  const out: Appointment[] = [];

  columns.forEach((key, col) => {
    for (const [at, minutes, service, client, tone] of DAY[key]) {
      const from = toHours(at);
      if (from < start || from + minutes / 60 > end) continue;
      out.push(
        service ? { col, at, minutes, service, client, tone } : { col, at, minutes, free: true },
      );
    }
  });

  return out.concat(extra);
}

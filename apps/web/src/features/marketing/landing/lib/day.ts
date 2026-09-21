/**
 * Один день — вторник, 9 сентября, Studio Nara.
 *
 * Каждый календарь на странице — окно в этот день, а не собственный набор
 * выдумок. Так гарантируется то, ради чего мокапы вообще стоят на лендинге:
 * герой, секция «Проблема», сравнение соло и салона и финальный экран
 * показывают одно и то же расписание с разных сторон, и читатель, который
 * пролистал страницу целиком, не ловит продукт на противоречии.
 *
 * Имена людей не переводятся — это имена. Услуги хранятся ключами словаря
 * (`svc*`) и переводятся вместе со страницей: мастер, читающий лендинг
 * по-русски, и прайс свой пишет по-русски, а «Gel manicure» рядом с «Вт,
 * 9 сен» читается как недоделка, а не как чужой салон.
 */
import type { Messages } from '@/lib/i18n/messages';

/** Ключ услуги в словаре лендинга. */
export type ServiceKey = Extract<keyof Messages['marketing'], `svc${string}`>;

/** Названия услуг на языке страницы — сам словарь лендинга подходит целиком. */
export type ServiceNames = Pick<Messages['marketing'], ServiceKey>;

/**
 * Тон человека — номер из шести `--tone-N` кабинета (`dashboard-shell/styles/
 * tokens.css`). Кабинет красит визит в цвет того, кто его ведёт, и мокап
 * обязан делать то же: иначе на лендинге показан не тот продукт, в который
 * мастер войдёт после регистрации.
 */
export type PersonTone = 1 | 2 | 3 | 4 | 5 | 6;

/** Мастер в мокапе: имя, инициалы и тон в календаре. */
export type Person = {
  name: string;
  initials: string;
  tone: PersonTone;
};

export const PEOPLE = {
  elina: { name: 'Elīna', initials: 'EO', tone: 1 },
  marta: { name: 'Marta', initials: 'MK', tone: 2 },
  ruta: { name: 'Rūta', initials: 'RB', tone: 3 },
  toms: { name: 'Toms', initials: 'TL', tone: 4 },
  anna: { name: 'Anna', initials: 'AL', tone: 5 },
  janis: { name: 'Jānis', initials: 'JR', tone: 6 },
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
  service?: ServiceKey;
  client?: string;
  /** Свободное окно вместо записи. */
  free?: boolean;
  /**
   * Запись, которую клиент сделал прямо сейчас, — первый экран держит её
   * отдельно от остального дня и выводит под нажатие на телефоне.
   */
  fresh?: boolean;
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
  service: ServiceKey | null,
  client?: string,
  fresh?: 'fresh',
];

const DAY: Record<PersonKey, DayEntry[]> = {
  elina: [
    ['09:30', 75, 'svcGelManicure', 'Kristīne J.'],
    ['11:00', 45, 'svcClassicManicure', 'Dana K.'],
    ['12:30', 60, 'svcLashLift', 'Ilze L.'],
    ['14:30', 75, 'svcGelManicure', 'Laura V.', 'fresh'],
  ],
  marta: [
    ['10:00', 30, 'svcBrowShaping', 'Anete S.'],
    ['11:00', 75, 'svcGelManicure', 'Marija P.'],
    ['13:00', 45, 'svcClassicManicure', 'Elza R.'],
    ['14:30', 30, 'svcBrowTint', 'Zane B.'],
  ],
  ruta: [
    ['09:00', 60, 'svcLashExtensions', 'Alise M.'],
    ['10:30', 30, 'svcBrowShaping', 'Liene D.'],
    ['12:00', 90, 'svcLashRefill', 'Sanita O.'],
    ['14:00', 60, 'svcLashLift', 'Kate P.'],
    ['15:30', 60, 'svcLashLift', 'Liene D.'],
  ],
  toms: [
    ['09:00', 45, 'svcHaircut', 'Mārtiņš R.'],
    ['10:00', 30, 'svcBeardTrim', 'Toms B.'],
    ['11:00', 50, 'svcSkinFade', 'Emīls K.'],
    ['13:00', 45, 'svcHaircut', 'Rihards A.'],
  ],
  anna: [
    ['10:00', 120, 'svcBalayage', 'Līga S.'],
    ['12:30', 20, 'svcColorConsult', 'Zane B.'],
    ['13:30', 60, 'svcHaircutStyle', 'Agnese V.'],
  ],
  janis: [
    ['09:30', 45, 'svcHaircut', 'Kārlis O.'],
    ['11:00', 75, 'svcHaircutBeard', 'Roberts M.'],
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
    for (const [at, minutes, service, client, fresh] of DAY[key]) {
      const from = toHours(at);
      if (from < start || from + minutes / 60 > end) continue;
      out.push(
        service
          ? { col, at, minutes, service, client, ...(fresh ? { fresh: true } : {}) }
          : { col, at, minutes, free: true },
      );
    }
  });

  return out.concat(extra);
}

/**
 * Тон услуги — точка перед именем клиента, как в сетке кабинета. Четыре тона
 * кабинета (`--service-*`) разложены по ремеслу: ногти, ресницы и брови,
 * волосы, барбер. Таблица полная: новая услуга без тона не соберётся.
 */
export type ServiceTone = 'rose' | 'slate' | 'clay' | 'sage';

const SERVICE_TONES: Record<ServiceKey, ServiceTone> = {
  svcGelManicure: 'rose',
  svcClassicManicure: 'rose',
  svcGelRemoval: 'rose',
  svcNailArt: 'rose',
  svcLashLift: 'slate',
  svcLashExtensions: 'slate',
  svcLashRefill: 'slate',
  svcBrowShaping: 'slate',
  svcBrowTint: 'slate',
  svcBalayage: 'clay',
  svcColorConsult: 'clay',
  svcHaircutStyle: 'clay',
  svcBlowDry: 'clay',
  svcHaircut: 'sage',
  svcHaircutBeard: 'sage',
  svcBeardTrim: 'sage',
  svcSkinFade: 'sage',
};

export function serviceTone(service: ServiceKey): ServiceTone {
  return SERVICE_TONES[service];
}

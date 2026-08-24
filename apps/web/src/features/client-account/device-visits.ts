/**
 * Память устройства о своих записях и о том, как человек представлялся.
 *
 * Самый короткий путь к «моим визитам»: у того, кто записался с этого
 * телефона, они открываются без почты, без письма и без единого лишнего
 * нажатия. Аккаунт остаётся нужен ровно для того, для чего он и нужен, —
 * увидеть свои визиты с другого устройства.
 *
 * Хранится минимум и хранится намеренно: секретный токен записи (он и так
 * лежал бы в истории браузера как адрес страницы статуса), имя мастера и
 * час визита теми же строками, что показала страница. Час — строкой, а не
 * меткой времени: время визита принадлежит поясу салона, а браузер, взявшись
 * его переводить, показал бы человеку в поездке не тот час, на который он
 * придёт.
 *
 * Всякое обращение к хранилищу обёрнуто: приватное окно Safari бросает на
 * запись, а чужой мусор по нашему ключу не должен ронять экран.
 */

const VISITS_KEY = 'amolie.device-visits.v1';
const GUEST_KEY = 'amolie.device-guest.v1';

/** Сколько дней запись остаётся в памяти устройства после своего часа. */
const KEEP_DAYS = 120;

/** Больше — уже не «мои записи», а склад: столько их у человека не бывает. */
const KEEP_MAX = 20;

export interface DeviceVisit {
  /** Секретный токен записи — ключ к её странице статуса. */
  token: string;
  slug: string;
  masterName: string;
  /** `YYYY-MM-DD` в поясе салона, как показала страница. */
  date: string;
  /** `HH:MM` там же. */
  time: string;
  /** Момент визита — только чтобы сортировать и убирать старое. */
  startsAt: string;
}

/** Как человек представился в последний раз на этом устройстве. */
export interface DeviceGuest {
  fullName: string;
  phone: string;
}

function readRaw(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Приватное окно, переполненное хранилище, запрет на сайт. Память
       устройства — удобство, а не условие записи: молчим. */
  }
}

function isVisit(value: unknown): value is DeviceVisit {
  if (typeof value !== 'object' || value === null) return false;
  const visit = value as Record<string, unknown>;
  return (
    typeof visit.token === 'string' &&
    typeof visit.slug === 'string' &&
    typeof visit.masterName === 'string' &&
    typeof visit.date === 'string' &&
    typeof visit.time === 'string' &&
    typeof visit.startsAt === 'string'
  );
}

/** Свежие сверху; всё, что старше `KEEP_DAYS`, уходит само. */
export function deviceVisits(now: Date = new Date()): DeviceVisit[] {
  const parsed = readRaw(VISITS_KEY);
  if (!Array.isArray(parsed)) return [];

  const oldest = now.getTime() - KEEP_DAYS * 24 * 60 * 60 * 1000;

  return parsed
    .filter(isVisit)
    .filter((visit) => {
      const at = new Date(visit.startsAt).getTime();
      return Number.isFinite(at) && at >= oldest;
    })
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .slice(0, KEEP_MAX);
}

/** Запомнить только что оформленную запись. Повторный токен не удваивается. */
export function rememberVisitOnDevice(visit: DeviceVisit, now: Date = new Date()): void {
  const kept = deviceVisits(now).filter((saved) => saved.token !== visit.token);
  write(VISITS_KEY, [visit, ...kept].slice(0, KEEP_MAX));
  notify();
}

/** Забыть одну запись — например, когда сервер ответил, что её больше нет. */
export function forgetVisitOnDevice(token: string, now: Date = new Date()): void {
  write(
    VISITS_KEY,
    deviceVisits(now).filter((visit) => visit.token !== token),
  );
  notify();
}

export function deviceGuest(): DeviceGuest | null {
  const parsed = readRaw(GUEST_KEY);
  if (typeof parsed !== 'object' || parsed === null) return null;

  const guest = parsed as Record<string, unknown>;
  if (typeof guest.fullName !== 'string' || typeof guest.phone !== 'string') return null;
  if (guest.fullName.trim().length === 0) return null;

  return { fullName: guest.fullName, phone: guest.phone };
}

export function rememberGuestOnDevice(guest: DeviceGuest): void {
  write(GUEST_KEY, guest);
  notify();
}

/*
 * Память устройства как источник для экрана.
 *
 * Хранилище живёт вне React, и читать его эффектом, раскладывая в состояние,
 * значит рисовать кадр заведомо неверным и тут же перерисовывать. Здесь для
 * этого есть `useSyncExternalStore`, которому нужны три вещи: подписка,
 * снимок и снимок для сервера. Снимок обязан быть тем же объектом, пока
 * ничего не менялось, — иначе React сочтёт, что данные меняются на каждом
 * кадре; отсюда кэш и его сброс на каждой записи.
 */

const NO_VISITS: DeviceVisit[] = [];

let visitsCache: DeviceVisit[] | null = null;
let guestCache: DeviceGuest | null | undefined;
const listeners = new Set<() => void>();

function forgetCache(): void {
  visitsCache = null;
  guestCache = undefined;
}

function notify(): void {
  forgetCache();
  for (const listener of listeners) listener();
}

/** Подписка на память устройства — включая правки из соседней вкладки. */
export function subscribeToDeviceMemory(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', notify);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', notify);
  };
}

export function deviceVisitsSnapshot(): DeviceVisit[] {
  visitsCache ??= deviceVisits();
  return visitsCache;
}

export function deviceGuestSnapshot(): DeviceGuest | null {
  if (guestCache === undefined) guestCache = deviceGuest();
  return guestCache;
}

/** На сервере памяти устройства нет — и притворяться, что есть, нельзя. */
export function noDeviceVisits(): DeviceVisit[] {
  return NO_VISITS;
}

export function noDeviceGuest(): DeviceGuest | null {
  return null;
}

/** Перечитать хранилище заново — например, когда его подменили в тесте. */
export function refreshDeviceMemory(): void {
  notify();
}

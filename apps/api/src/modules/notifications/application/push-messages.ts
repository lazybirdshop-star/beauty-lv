import type { UserLocale } from '@amolie/shared-kernel';

import type { PushMessage } from '../domain/push-message';

/**
 * Тексты push-уведомлений на трёх языках.
 *
 * Отдельно от `letters.ts` по существу жанра, а не ради симметрии: письмо
 * можно дочитать, уведомление — только увидеть. Здесь нет обращения, нет
 * подписи и нет объяснений; есть один заголовок и одна строка, которая должна
 * поместиться на экране блокировки и ответить на три вопроса — кто, когда, на
 * что.
 */

const TITLE: Record<UserLocale, string> = {
  ru: 'Новая запись',
  lv: 'Jauns pieraksts',
  en: 'New booking',
};

/**
 * Локаль форматирования дат — не то же самое, что язык продукта: `ru` это
 * язык, а `Intl` нужен регион, чтобы выбрать порядок дня и месяца и
 * 24-часовые часы.
 */
const DATE_LOCALE: Record<UserLocale, string> = {
  ru: 'ru-RU',
  lv: 'lv-LV',
  en: 'en-GB',
};

/**
 * Сколько услуг перечислять поимённо, прежде чем свернуть остаток в счётчик.
 *
 * Две: строка уведомления обрезается системой без предупреждения, и лучше
 * честное «+2» в конце, чем третье название, оборванное на середине.
 */
const SERVICES_SHOWN = 2;

export interface NewBookingFacts {
  /** Как клиент представился при записи. */
  clientName: string;
  startsAt: Date;
  serviceNames: string[];
  /** Пояс организации: время визита принадлежит салону, а не серверу. */
  timeZone: string;
  organizationSlug: string;
  /** Id записи — им уведомления отличаются друг от друга, см. `PushMessage.tag`. */
  bookingId: string;
}

function formatWhen(locale: UserLocale, startsAt: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(startsAt);
}

function formatServices(locale: UserLocale, names: string[]): string {
  if (names.length <= SERVICES_SHOWN) return names.join(', ');

  const rest = names.length - SERVICES_SHOWN;
  return `${names.slice(0, SERVICES_SHOWN).join(', ')} +${rest}`;
}

export function newBookingMessage(locale: UserLocale, facts: NewBookingFacts): PushMessage {
  const parts = [
    facts.clientName,
    formatWhen(locale, facts.startsAt, facts.timeZone),
    formatServices(locale, facts.serviceNames),
  ].filter((part) => part.length > 0);

  return {
    title: TITLE[locale],
    body: parts.join(' · '),
    /* Нажатие ведёт в «Записи», а не на главную кабинета: уведомление пришло
       про конкретное событие, и мастер должна оказаться там, где его можно
       подтвердить, а не там, откуда до него ещё два перехода. */
    url: `/${facts.organizationSlug}/dashboard/bookings`,
    /* Тег с id записи: две записи подряд обязаны остаться двумя уведомлениями.
       Общий тег заменил бы первое вторым, и мастер не узнала бы про первое. */
    tag: `booking-${facts.bookingId}`,
  };
}

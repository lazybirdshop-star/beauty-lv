import type { UserLocale } from '@amolie/shared-kernel';

import { renderLetter, type Letter } from './letter-template';

/**
 * Письма клиенту о его визите.
 *
 * Отдельным файлом от `letters.ts`: там письма об **аккаунте** и адресат у них
 * — мастер, здесь письма о **визите** и адресат — человек, который записался,
 * чаще всего без аккаунта вовсе. Язык тоже берётся по-разному: у аккаунта из
 * `users.locale`, здесь — из языка страницы, на которой человек записывался.
 *
 * Чего эти письма не делают: не обещают того, чего в продукте нет. Перенести
 * визит клиент сам не может, поэтому письмо зовёт написать мастеру, а не
 * «изменить запись по ссылке».
 */
interface VisitFacts {
  /** Имя мастера или салона — то, что человек видел на странице записи. */
  master: string;
  /** «понедельник, 1 сентября, 10:00» — уже собранное в поясе салона. */
  when: string;
  services: string;
}

const CREATED: Record<UserLocale, (facts: VisitFacts) => Letter> = {
  ru: ({ master, when, services }) => ({
    subject: `Запись к ${master} — ${when}`,
    heading: 'Заявка принята',
    body: [
      `${when}. ${services}.`,
      `Запись подтвердит мастер (${master}) — до этого она числится заявкой. Ответ придёт письмом: мастер отвечает до начала визита, а если не ответит, заявка отменится сама.`,
    ],
    action: {
      label: 'Посмотреть запись',
      note: 'На этой странице видно состояние записи и, когда её подтвердят, — кнопку «добавить в календарь».',
    },
  }),
  lv: ({ master, when, services }) => ({
    subject: `Pieraksts pie ${master} — ${when}`,
    heading: 'Pieteikums saņemts',
    body: [
      `${when}. ${services}.`,
      `Pierakstu apstiprinās meistars (${master}) — līdz tam tas skaitās pieteikums. Atbilde pienāks vēstulē: meistars atbild pirms vizītes sākuma, bet, ja neatbildēs, pieteikums atcelsies pats.`,
    ],
    action: {
      label: 'Apskatīt pierakstu',
      note: 'Šajā lapā redzams pieraksta stāvoklis un, kad to apstiprinās, poga «pievienot kalendāram».',
    },
  }),
  en: ({ master, when, services }) => ({
    subject: `Booking with ${master} — ${when}`,
    heading: 'Request received',
    body: [
      `${when}. ${services}.`,
      `${master} will confirm the booking — until then it counts as a request. The answer comes by letter: she answers before the visit begins, and if she does not, the request cancels itself.`,
    ],
    action: {
      label: 'See the booking',
      note: 'That page shows the state of your booking and, once confirmed, the "add to calendar" button.',
    },
  }),
};

const CONFIRMED: Record<UserLocale, (facts: VisitFacts) => Letter> = {
  ru: ({ master, when, services }) => ({
    subject: `Визит подтверждён — ${when}`,
    heading: 'Визит подтверждён',
    body: [`${when}. ${services}.`, `Запись подтверждена: ${master} ждёт вас в это время.`],
    action: {
      label: 'Добавить в календарь',
      note: 'На странице записи есть файл для календаря телефона и ссылка Google Календаря.',
    },
  }),
  lv: ({ master, when, services }) => ({
    subject: `Pieraksts apstiprināts — ${when}`,
    heading: 'Pieraksts apstiprināts',
    body: [`${when}. ${services}.`, `Pieraksts apstiprināts: ${master} gaida jūs šajā laikā.`],
    action: {
      label: 'Pievienot kalendāram',
      note: 'Pieraksta lapā ir kalendāra fails tālrunim un Google kalendāra saite.',
    },
  }),
  en: ({ master, when, services }) => ({
    subject: `Booking confirmed — ${when}`,
    heading: 'You are expected',
    body: [
      `${when}. ${services}.`,
      `The booking is confirmed: ${master} expects you at that time.`,
    ],
    action: {
      label: 'Add to calendar',
      note: 'The booking page has a calendar file for your phone and a Google Calendar link.',
    },
  }),
};

const CANCELLED: Record<UserLocale, (facts: VisitFacts) => Letter> = {
  ru: ({ master, when, services }) => ({
    subject: `Визит отменён — ${when}`,
    heading: 'Визит отменён',
    body: [
      `${when}. ${services}.`,
      `Эту запись отменил мастер (${master}). Если хотите прийти в другое время, выберите свободное окно на странице записи.`,
    ],
    action: { label: 'Выбрать другое время', note: 'Страница записи.' },
  }),
  lv: ({ master, when, services }) => ({
    subject: `Pieraksts atcelts — ${when}`,
    heading: 'Pieraksts atcelts',
    body: [
      `${when}. ${services}.`,
      `Šo pierakstu atcēla meistars (${master}). Ja vēlaties atnākt citā laikā, izvēlieties brīvu logu pieraksta lapā.`,
    ],
    action: { label: 'Izvēlēties citu laiku', note: 'Pieraksta lapa.' },
  }),
  en: ({ master, when, services }) => ({
    subject: `Booking cancelled — ${when}`,
    heading: 'The booking is cancelled',
    body: [
      `${when}. ${services}.`,
      `${master} cancelled this booking. To come at another time, pick a free window on the booking page.`,
    ],
    action: { label: 'Pick another time', note: 'The booking page.' },
  }),
};

const REMINDER: Record<UserLocale, (facts: VisitFacts) => Letter> = {
  ru: ({ master, when, services }) => ({
    subject: `Напоминание о визите — ${when}`,
    heading: 'Скоро визит',
    body: [
      `${when}. ${services}.`,
      `Если планы изменились, напишите мастеру (${master}) — время сможет занять кто-то другой.`,
    ],
    action: { label: 'Посмотреть запись', note: 'Там же — контакты мастера.' },
  }),
  lv: ({ master, when, services }) => ({
    subject: `Atgādinājums par pierakstu — ${when}`,
    heading: 'Drīz pieraksts',
    body: [
      `${when}. ${services}.`,
      `Ja plāni mainījušies, rakstiet meistaram (${master}) — laiku varēs aizņemt kāds cits.`,
    ],
    action: { label: 'Apskatīt pierakstu', note: 'Tur pat — meistara kontakti.' },
  }),
  en: ({ master, when, services }) => ({
    subject: `Reminder about your visit — ${when}`,
    heading: 'Your visit is coming up',
    body: [
      `${when}. ${services}.`,
      `If your plans changed, write to ${master} — somebody else could take the time.`,
    ],
    action: { label: 'See the booking', note: "The master's contacts are there too." },
  }),
};

export function bookingCreatedLetter(locale: UserLocale, facts: VisitFacts, url: string) {
  return renderLetter(CREATED[locale](facts), url);
}

export function bookingConfirmedLetter(locale: UserLocale, facts: VisitFacts, url: string) {
  return renderLetter(CONFIRMED[locale](facts), url);
}

export function bookingCancelledLetter(locale: UserLocale, facts: VisitFacts, url: string) {
  return renderLetter(CANCELLED[locale](facts), url);
}

export function bookingReminderLetter(locale: UserLocale, facts: VisitFacts, url: string) {
  return renderLetter(REMINDER[locale](facts), url);
}

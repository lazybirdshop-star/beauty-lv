/**
 * Тексты писем на трёх языках.
 *
 * Живут в API, а не в словарях фронтенда: письмо отправляет сервер, и язык
 * берётся из `users.locale` — того самого, который мастер выбрала в кабинете.
 * Тащить сюда клиентский словарь значило бы связать сервер со сборкой веба.
 *
 * Разметка писем нарочно примитивная: почтовые клиенты десятилетиями
 * поддерживают разное подмножество CSS, и единственная надёжная верстка —
 * та, которой почти нет. Текстовая версия обязательна: без неё письмо
 * заметно вероятнее уедет в спам.
 */

import type { UserLocale } from '@amolie/shared-kernel';

interface Letter {
  subject: string;
  heading: string;
  body: string[];
  action?: { label: string; note: string };
}

const WELCOME: Record<UserLocale, (name: string) => Letter> = {
  ru: (name) => ({
    subject: 'AMOLIE — кабинет готов',
    heading: `${name}, добро пожаловать`,
    body: [
      'Кабинет создан. Дальше три шага: добавьте услуги с ценами, откройте свободные окна в календаре и отправьте клиентам ссылку на свою страницу.',
      'Чтобы не пропустить клиента, включите уведомления о новых записях в настройках кабинета: телефон покажет запись сразу, как её создадут. Пока они выключены, о записях вы узнаёте, только заглянув в кабинет.',
    ],
    action: { label: 'Открыть кабинет', note: 'Ссылка ведёт на вход в AMOLIE.' },
  }),
  lv: (name) => ({
    subject: 'AMOLIE — kabinets ir gatavs',
    heading: `${name}, laipni lūdzam`,
    body: [
      'Kabinets izveidots. Tālāk trīs soļi: pievienojiet pakalpojumus ar cenām, atveriet brīvos logus kalendārā un nosūtiet klientiem saiti uz savu lapu.',
      'Lai nepalaistu garām klientu, ieslēdziet paziņojumus par jauniem pierakstiem kabineta iestatījumos: tālrunis parādīs pierakstu uzreiz pēc tā izveides. Kamēr tie ir izslēgti, par pierakstiem uzzināsiet, tikai ieskatoties kabinetā.',
    ],
    action: { label: 'Atvērt kabinetu', note: 'Saite ved uz AMOLIE pieteikšanos.' },
  }),
  en: (name) => ({
    subject: 'AMOLIE — your dashboard is ready',
    heading: `${name}, welcome`,
    body: [
      'Your dashboard is created. Three steps next: add your services with prices, open the windows you are free in the calendar, and send clients the link to your page.',
      'So you do not miss a client, turn on booking notifications in the dashboard settings: your phone shows the booking the moment it is made. While they are off, you learn about bookings only by opening the dashboard.',
    ],
    action: { label: 'Open the dashboard', note: 'The link goes to the AMOLIE sign-in page.' },
  }),
};

const VERIFY: Record<UserLocale, Letter> = {
  ru: {
    subject: 'AMOLIE — подтвердите адрес',
    heading: 'Подтвердите почту',
    body: [
      'Это тот адрес, по которому мы восстановим доступ, если вы забудете пароль. Подтвердите его — займёт одну секунду.',
    ],
    action: { label: 'Подтвердить адрес', note: 'Ссылка действует сутки.' },
  },
  lv: {
    subject: 'AMOLIE — apstipriniet adresi',
    heading: 'Apstipriniet e-pastu',
    body: [
      'Šī ir adrese, pa kuru atjaunosim piekļuvi, ja aizmirsīsiet paroli. Apstipriniet to — tas aizņems sekundi.',
    ],
    action: { label: 'Apstiprināt adresi', note: 'Saite ir derīga diennakti.' },
  },
  en: {
    subject: 'AMOLIE — confirm your address',
    heading: 'Confirm your email',
    body: [
      'This is the address we will use to restore access if you forget your password. Confirming takes a second.',
    ],
    action: { label: 'Confirm the address', note: 'The link is valid for 24 hours.' },
  },
};

const RESET: Record<UserLocale, Letter> = {
  ru: {
    subject: 'AMOLIE — новый пароль',
    heading: 'Восстановление пароля',
    body: [
      'Кто-то запросил смену пароля для этого аккаунта. Если это были вы — задайте новый пароль по ссылке ниже.',
      'Если это были не вы, ничего делать не нужно: пароль останется прежним, а ссылка протухнет сама.',
    ],
    action: {
      label: 'Задать новый пароль',
      note: 'Ссылка действует один час и срабатывает один раз.',
    },
  },
  lv: {
    subject: 'AMOLIE — jauna parole',
    heading: 'Paroles atjaunošana',
    body: [
      'Kāds pieprasīja paroles maiņu šim kontam. Ja tas bijāt jūs — iestatiet jaunu paroli pa saiti zemāk.',
      'Ja tas nebijāt jūs, nekas nav jādara: parole paliks nemainīga, un saite pati kļūs nederīga.',
    ],
    action: {
      label: 'Iestatīt jaunu paroli',
      note: 'Saite ir derīga stundu un nostrādā vienu reizi.',
    },
  },
  en: {
    subject: 'AMOLIE — new password',
    heading: 'Password reset',
    body: [
      'Someone asked to change the password for this account. If that was you, set a new one with the link below.',
      'If it was not you, there is nothing to do: the password stays as it is and the link expires on its own.',
    ],
    action: { label: 'Set a new password', note: 'The link is valid for one hour and works once.' },
  },
};

/** Экранирование: имя мастера — пользовательский ввод, и оно попадает в HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function render(letter: Letter, url: string): { html: string; text: string } {
  const paragraphs = letter.body
    .map(
      (line) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#635b52">${escapeHtml(line)}</p>`,
    )
    .join('');

  const action = letter.action
    ? `<p style="margin:24px 0 8px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#16130f;color:#f2efe9;text-decoration:none;padding:14px 26px;font-size:15px">${escapeHtml(letter.action.label)}</a></p>
       <p style="margin:0;font-size:13px;color:#8c8377">${escapeHtml(letter.action.note)}</p>
       <p style="margin:16px 0 0;font-size:13px;color:#8c8377;word-break:break-all">${escapeHtml(url)}</p>`
    : '';

  const html = `<!doctype html><html><body style="margin:0;background:#ede9e3;padding:32px 16px;font-family:-apple-system,Segoe UI,system-ui,sans-serif">
<table role="presentation" style="max-width:520px;margin:0 auto;background:#f6f4f0;padding:32px" cellpadding="0" cellspacing="0"><tr><td>
<p style="margin:0 0 28px;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#a63a5f">AMOLIE</p>
<h1 style="margin:0 0 20px;font-size:24px;line-height:1.2;color:#16130f;font-weight:500">${escapeHtml(letter.heading)}</h1>
${paragraphs}${action}
</td></tr></table></body></html>`;

  const text = [letter.heading, '', ...letter.body, '', letter.action ? url : ''].join('\n').trim();

  return { html, text };
}

export function welcomeLetter(locale: UserLocale, name: string, url: string) {
  const letter = WELCOME[locale](name);
  return { subject: letter.subject, ...render(letter, url) };
}

export function verifyEmailLetter(locale: UserLocale, url: string) {
  const letter = VERIFY[locale];
  return { subject: letter.subject, ...render(letter, url) };
}

export function passwordResetLetter(locale: UserLocale, url: string) {
  const letter = RESET[locale];
  return { subject: letter.subject, ...render(letter, url) };
}

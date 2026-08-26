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

/**
 * Вход клиента в его кабинет.
 *
 * Единственное письмо, которое уходит не мастеру, и язык у него берётся не из
 * `users.locale`: у человека, который только что записался, аккаунта ещё нет.
 * Его выбирает страница, с которой он пришёл, — та самая, на языке которой он
 * читал названия услуг минуту назад.
 */
const CLIENT_SIGN_IN: Record<UserLocale, Letter> = {
  ru: {
    subject: 'AMOLIE — ваши визиты',
    heading: 'Вход по ссылке',
    body: [
      'Откройте ссылку ниже — и увидите свои визиты: когда, к кому, какие услуги и подтверждена ли запись. Пароль не нужен, его у вас и нет.',
      'Если ссылку запрашивали не вы, ничего делать не нужно: она перестанет работать сама.',
    ],
    action: {
      label: 'Открыть мои визиты',
      note: 'Ссылка действует час и срабатывает один раз.',
    },
  },
  lv: {
    subject: 'AMOLIE — jūsu vizītes',
    heading: 'Pieteikšanās ar saiti',
    body: [
      'Atveriet saiti zemāk — un redzēsiet savas vizītes: kad, pie kā, kādi pakalpojumi un vai pieraksts ir apstiprināts. Parole nav vajadzīga, un jums tādas nav.',
      'Ja saiti pieprasījāt nevis jūs, nekas nav jādara: tā pati kļūs nederīga.',
    ],
    action: {
      label: 'Atvērt manas vizītes',
      note: 'Saite ir derīga stundu un nostrādā vienu reizi.',
    },
  },
  en: {
    subject: 'AMOLIE — your visits',
    heading: 'Sign in with a link',
    body: [
      'Open the link below to see your visits: when, with whom, which services, and whether the booking is confirmed. No password needed — you do not have one.',
      'If you did not ask for this link, there is nothing to do: it expires on its own.',
    ],
    action: {
      label: 'Open my visits',
      note: 'The link is valid for one hour and works once.',
    },
  },
};

/**
 * Три письма о заявке на регистрацию.
 *
 * Отказ — самое важное из них. Молчание в ответ на заявку человек читает как
 * «меня проигнорировали», и через неделю он приходит второй раз с тем же
 * адресом. Поэтому письмо об отказе есть всегда, а причина в нём — та, что
 * написал администратор, а не общая формула.
 */
const REQUEST_RECEIVED: Record<UserLocale, (name: string) => Letter> = {
  ru: (name) => ({
    subject: 'AMOLIE — заявка получена',
    heading: `${name}, заявка получена`,
    body: [
      'Мы прочитаем её и ответим на этот адрес. Пока платформа открывается по одной, поэтому решение принимает человек, а не форма.',
      'Пароль, который вы задали, уже сохранён: когда заявку одобрят, вы войдёте с ним, ничего не придумывая заново.',
    ],
  }),
  lv: (name) => ({
    subject: 'AMOLIE — pieteikums saņemts',
    heading: `${name}, pieteikums saņemts`,
    body: [
      'Mēs to izlasīsim un atbildēsim uz šo adresi. Platforma pagaidām tiek atvērta pa vienam, tāpēc lēmumu pieņem cilvēks, nevis forma.',
      'Jūsu izvēlētā parole jau ir saglabāta: kad pieteikumu apstiprinās, jūs ar to pieteiksieties, neizdomājot neko no jauna.',
    ],
  }),
  en: (name) => ({
    subject: 'AMOLIE — request received',
    heading: `${name}, we have your request`,
    body: [
      'We will read it and reply to this address. The platform is opening one master at a time, so a person decides, not a form.',
      'The password you chose is already saved: once the request is approved you sign in with it, nothing to invent again.',
    ],
  }),
};

/**
 * Заявка на адрес, с которого уже подавали.
 *
 * Форма регистрации отвечает одинаково и на новый адрес, и на этот — иначе
 * она работает проверялкой «есть ли у вас заявка на AMOLIE», а список тех,
 * кто хочет открыть салон, посторонним не принадлежит (то же правило, что у
 * восстановления пароля, см. `account-mail.service.ts`). Значит, сказать об
 * этом можно только владельцу адреса, и только письмом.
 */
const REQUEST_DUPLICATE: Record<UserLocale, () => Letter> = {
  ru: () => ({
    subject: 'AMOLIE — заявка уже на рассмотрении',
    heading: 'Заявка с этого адреса уже подана',
    body: [
      'Мы получили её раньше и ответим на этот адрес, как только примем решение. Подавать ещё раз не нужно — новая заявка не ускорит очередь.',
      'Если заявку подавали не вы, делать ничего не нужно: без ответа на это письмо кабинет не появится.',
    ],
  }),
  lv: () => ({
    subject: 'AMOLIE — pieteikums jau tiek izskatīts',
    heading: 'Pieteikums no šīs adreses jau ir iesniegts',
    body: [
      'Mēs to saņēmām agrāk un atbildēsim uz šo adresi, tiklīdz pieņemsim lēmumu. Iesniegt vēlreiz nav vajadzības — jauns pieteikums rindu nepaātrinās.',
      'Ja pieteikumu iesniedzāt nevis jūs, nekas nav jādara: bez atbildes uz šo vēstuli kabinets neparādīsies.',
    ],
  }),
  en: () => ({
    subject: 'AMOLIE — your request is already in review',
    heading: 'A request from this address is already in',
    body: [
      'We received it earlier and will reply to this address once we decide. No need to send another — a second request will not move the queue.',
      'If this was not you, there is nothing to do: no account appears without a reply to this letter.',
    ],
  }),
};

const REQUEST_APPROVED: Record<UserLocale, (name: string) => Letter> = {
  ru: (name) => ({
    subject: 'AMOLIE — заявка одобрена',
    heading: `${name}, добро пожаловать`,
    body: [
      'Кабинет создан. Входите тем же адресом и паролем, которые вы указали в заявке.',
      'Дальше три шага: добавьте услуги с ценами, откройте свободные окна в календаре и отправьте клиентам ссылку на свою страницу.',
    ],
    action: { label: 'Войти в кабинет', note: 'Ссылка ведёт на вход в AMOLIE.' },
  }),
  lv: (name) => ({
    subject: 'AMOLIE — pieteikums apstiprināts',
    heading: `${name}, laipni lūdzam`,
    body: [
      'Kabinets izveidots. Piesakieties ar to pašu adresi un paroli, ko norādījāt pieteikumā.',
      'Tālāk trīs soļi: pievienojiet pakalpojumus ar cenām, atveriet brīvos logus kalendārā un nosūtiet klientiem saiti uz savu lapu.',
    ],
    action: { label: 'Atvērt kabinetu', note: 'Saite ved uz AMOLIE pieteikšanos.' },
  }),
  en: (name) => ({
    subject: 'AMOLIE — request approved',
    heading: `${name}, welcome`,
    body: [
      'Your dashboard is ready. Sign in with the same address and password you gave in the request.',
      'Three steps next: add your services with prices, open the windows you are free in the calendar, and send clients the link to your page.',
    ],
    action: { label: 'Sign in', note: 'The link goes to the AMOLIE sign-in page.' },
  }),
};

const REQUEST_UPGRADE: Record<UserLocale, (name: string) => Letter> = {
  ru: (name) => ({
    subject: 'AMOLIE — подтвердите переход в кабинет мастера',
    heading: `${name}, заявка одобрена`,
    body: [
      'На этот адрес у вас уже есть аккаунт клиента. Мы не заводим второй: кабинет мастера откроется на нём же, и ваши прошлые записи останутся с вами.',
      'Подтвердите, что это вы, — и кабинет будет готов. Пароль тот, который вы задали в заявке.',
    ],
    action: {
      label: 'Открыть кабинет мастера',
      note: 'Ссылка действует трое суток и сработает один раз.',
    },
  }),
  lv: (name) => ({
    subject: 'AMOLIE — apstipriniet pāreju uz meistara kabinetu',
    heading: `${name}, pieteikums apstiprināts`,
    body: [
      'Uz šo adresi jums jau ir klienta konts. Mēs neveidojam otru: meistara kabinets atvērsies tajā pašā kontā, un jūsu iepriekšējie pieraksti paliks pie jums.',
      'Apstipriniet, ka tas esat jūs, — un kabinets būs gatavs. Parole ir tā, ko norādījāt pieteikumā.',
    ],
    action: {
      label: 'Atvērt meistara kabinetu',
      note: 'Saite ir derīga trīs diennaktis un nostrādās vienu reizi.',
    },
  }),
  en: (name) => ({
    subject: 'AMOLIE — confirm your move to a master account',
    heading: `${name}, your request is approved`,
    body: [
      'You already have a client account on this address. We are not creating a second one: your master dashboard opens on the same account, and your past bookings stay with you.',
      'Confirm it is you and the dashboard is ready. The password is the one you set in the request.',
    ],
    action: {
      label: 'Open the master dashboard',
      note: 'The link is valid for three days and works once.',
    },
  }),
};

const REQUEST_REJECTED: Record<UserLocale, (name: string, reason: string) => Letter> = {
  ru: (name, reason) => ({
    subject: 'AMOLIE — по заявке принято решение',
    heading: `${name}, пока не получится`,
    body: [reason, 'Если что-то изменится, отправьте заявку ещё раз — этот адрес не заблокирован.'],
  }),
  lv: (name, reason) => ({
    subject: 'AMOLIE — lēmums par pieteikumu',
    heading: `${name}, pagaidām nesanāks`,
    body: [reason, 'Ja kaut kas mainīsies, atsūtiet pieteikumu vēlreiz — šī adrese nav bloķēta.'],
  }),
  en: (name, reason) => ({
    subject: 'AMOLIE — a decision on your request',
    heading: `${name}, not this time`,
    body: [reason, 'If something changes, send the request again — this address is not blocked.'],
  }),
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

export function clientSignInLetter(locale: UserLocale, url: string) {
  const letter = CLIENT_SIGN_IN[locale];
  return { subject: letter.subject, ...render(letter, url) };
}

export function registrationReceivedLetter(locale: UserLocale, name: string) {
  const letter = REQUEST_RECEIVED[locale](name);
  return { subject: letter.subject, ...render(letter, '') };
}

export function registrationDuplicateLetter(locale: UserLocale) {
  const letter = REQUEST_DUPLICATE[locale]();
  return { subject: letter.subject, ...render(letter, '') };
}

export function registrationApprovedLetter(locale: UserLocale, name: string, url: string) {
  const letter = REQUEST_APPROVED[locale](name);
  return { subject: letter.subject, ...render(letter, url) };
}

/**
 * Одобрение человеку, у которого аккаунт уже есть: не «входите», а
 * «подтвердите». Разница принципиальная — без перехода по ссылке кабинета не
 * появится, и письмо обязано сказать это прямо, иначе он будет ждать.
 */
export function registrationUpgradeLetter(locale: UserLocale, name: string, url: string) {
  const letter = REQUEST_UPGRADE[locale](name);
  return { subject: letter.subject, ...render(letter, url) };
}

/** Причина приходит от администратора и попадает в письмо как есть — экранирование в `render`. */
export function registrationRejectedLetter(locale: UserLocale, name: string, reason: string) {
  const letter = REQUEST_REJECTED[locale](name, reason);
  return { subject: letter.subject, ...render(letter, '') };
}

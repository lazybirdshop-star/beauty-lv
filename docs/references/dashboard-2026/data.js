/* Фикстуры прототипа. Сегодня — суббота, 12 сентября 2026, 13:42. Все данные примерные. */
window.P = window.P || {};
(function (P) {
  P.NOW = { h: 13, m: 42, label: '13:42', dateLong: 'суббота, 12 сентября', dateShort: '12 сен', iso: '2026-09-12' };

  P.MEMBERS = [
    { id: 'marta', name: 'Марта Калныня', short: 'Марта', role: 'owner', tone: 'm2', trade: 'Владелица, колорист', phone: '+371 26 411 902', email: 'marta@lumen.lv', joined: '3 марта 2025', todayCount: 3, upcoming: 14, services: ['s-color', 's-cut-w', 's-style'] },
    { id: 'ieva', name: 'Иева Озола', short: 'Иева', role: 'admin', tone: 'm4', trade: 'Администратор', phone: '+371 29 118 340', email: 'ieva@lumen.lv', joined: '8 мая 2025', todayCount: 0, upcoming: 0, services: [] },
    { id: 'anna', name: 'Анна Берзиня', short: 'Анна', role: 'master', tone: 'm1', trade: 'Ногтевой сервис', phone: '+371 27 640 118', email: 'anna.b@lumen.lv', joined: '19 июня 2025', todayCount: 6, upcoming: 22, services: ['s-mani', 's-mani-gel', 's-pedi', 's-remove'] },
    { id: 'liene', name: 'Лиене Розе', short: 'Лиене', role: 'master', tone: 'm3', trade: 'Брови и ресницы', phone: '+371 26 003 771', email: 'liene@lumen.lv', joined: '1 сентября 2025', todayCount: 4, upcoming: 9, services: ['s-lash', 's-brow', 's-lami'] },
    { id: 'davis', name: 'Давис Озолс', short: 'Давис', role: 'master', tone: 'm6', trade: 'Барбер', phone: '+371 28 552 019', email: 'davis@lumen.lv', joined: '12 января 2026', todayCount: 5, upcoming: 17, services: ['s-cut-m', 's-beard', 's-cut-w'], invited: false },
    { id: 'kate', name: 'Катрина Лапа', short: 'Катрина', role: 'master', tone: 'm5', trade: 'Массаж', phone: '', email: 'katrina.lapa@gmail.com', joined: '', todayCount: 0, upcoming: 0, services: [], invited: true, invitedAt: '10 сентября' },
  ];
  P.SOLO = { id: 'neve', name: 'Неве Лиепа', short: 'Неве', role: 'owner', tone: 'm1', trade: 'Ногтевой сервис', phone: '+371 26 771 004', email: 'neve@nevenails.lv', joined: '14 февраля 2026' };
  P.PLATFORM_ME = { id: 'platform', name: 'Андрис Лиепиньш', short: 'Андрис', role: 'platform', tone: 'm4', trade: 'Администратор платформы', phone: '+371 20 000 000', email: 'andris@amolie.com', joined: '1 февраля 2025' };

  P.CATEGORIES = [
    { id: 'c-nails', name: 'Ногти', visible: true, color: '#E2568A' },
    { id: 'c-face', name: 'Брови и ресницы', visible: true, color: '#9164C4' },
    { id: 'c-hair', name: 'Волосы', visible: true, color: '#2E7A58' },
    { id: 'c-none', name: 'Без категории', visible: true, color: '' },
  ];
  P.SERVICES = [
    { id: 's-mani', cat: 'c-nails', name: 'Маникюр классический', duration: 60, buffer: 10, price: 30, visible: true, color: '#E2568A', performers: ['anna'], desc: 'Обработка кутикулы, форма, полировка.' },
    { id: 's-mani-gel', cat: 'c-nails', name: 'Маникюр с покрытием гель-лак', duration: 90, buffer: 10, price: 45, visible: true, color: '#E2568A', performers: ['anna'], addons: ['s-remove'], desc: 'Маникюр и покрытие. Дизайн обсуждается на месте.' },
    { id: 's-pedi', cat: 'c-nails', name: 'Педикюр с покрытием', duration: 75, buffer: 15, price: 48, visible: true, color: '#C9426F', performers: ['anna'] },
    { id: 's-remove', cat: 'c-nails', name: 'Снятие покрытия', duration: 20, buffer: 0, price: 8, visible: true, color: '', performers: ['anna'] },
    { id: 's-lash', cat: 'c-face', name: 'Наращивание ресниц, классика', duration: 120, buffer: 10, price: 55, visible: true, color: '#9164C4', performers: ['liene'] },
    { id: 's-lami', cat: 'c-face', name: 'Ламинирование ресниц', duration: 60, buffer: 5, price: 40, visible: true, color: '#9164C4', performers: ['liene'] },
    { id: 's-brow', cat: 'c-face', name: 'Коррекция и окрашивание бровей', duration: 30, buffer: 5, price: 18, visible: true, color: '#684096', performers: ['liene'] },
    { id: 's-cut-w', cat: 'c-hair', name: 'Женская стрижка', duration: 60, buffer: 10, price: 35, visible: true, color: '#2E7A58', performers: ['marta', 'davis'] },
    { id: 's-color', cat: 'c-hair', name: 'Окрашивание в один тон', duration: 150, buffer: 15, price: 90, visible: true, color: '#2E7A58', performers: ['marta'] },
    { id: 's-style', cat: 'c-hair', name: 'Укладка', duration: 40, buffer: 5, price: 25, visible: false, color: '', performers: ['marta'] },
    { id: 's-cut-m', cat: 'c-hair', name: 'Мужская стрижка', duration: 45, buffer: 5, price: 25, visible: true, color: '#1F6B4C', performers: ['davis'] },
    { id: 's-beard', cat: 'c-hair', name: 'Стрижка бороды', duration: 30, buffer: 5, price: 15, visible: true, color: '', performers: ['davis'] },
  ];
  P.SOLO_SERVICES = P.SERVICES.filter((s) => s.cat === 'c-nails').map((s) => ({ ...s, performers: ['neve'] }));

  P.CLIENTS = [
    { id: 'k1', name: 'Элина Круминя', phone: '+371 26 550 118', email: 'elina.k@inbox.lv', visits: 14, lastVisit: '29 авг', since: 'марта 2025', spent: 612, cancelled: 1, noShow: 0, flag: 'fav', notes: 'Любит форму «мягкий квадрат», аллергия на акрил. Пьёт чай без сахара.', fav: 'Маникюр с покрытием гель-лак', member: 'anna', solo: true },
    { id: 'k2', name: 'Дарья Соколова', phone: '+371 29 004 771', email: '', visits: 3, lastVisit: '2 сен', since: 'июля 2026', spent: 135, cancelled: 0, noShow: 0, flag: '', notes: '', fav: 'Маникюр с покрытием гель-лак' , member: 'anna', solo: true },
    { id: 'k3', name: 'Мартиньш Берзиньш', phone: '+371 27 118 902', email: 'm.berzins@gmail.com', visits: 9, lastVisit: '5 сен', since: 'ноября 2025', spent: 240, cancelled: 0, noShow: 1, flag: '', notes: 'Стрижка машинкой 3 по бокам.', fav: 'Мужская стрижка' , member: 'davis' },
    { id: 'k4', name: 'Лаура Витола', phone: '+371 26 771 003', email: '', visits: 1, lastVisit: '', since: 'сентября 2026', spent: 0, cancelled: 0, noShow: 0, flag: '', notes: '', fav: '' , member: 'neve', solo: true },
    { id: 'k5', name: 'Инесе Заринья', phone: '+371 29 330 410', email: 'inese.z@inbox.lv', visits: 22, lastVisit: '10 сен', since: 'февраля 2025', spent: 1180, cancelled: 2, noShow: 0, flag: 'fav', notes: 'Постоянная. Раз в три недели ресницы.', fav: 'Наращивание ресниц, классика' , member: 'liene' },
    { id: 'k6', name: 'Роберт Калнс', phone: '+371 28 900 216', email: '', visits: 2, lastVisit: '20 авг', since: 'августа 2026', spent: 40, cancelled: 1, noShow: 1, flag: 'attention', notes: 'Дважды не пришёл без предупреждения.', fav: 'Мужская стрижка' , member: 'davis' },
    { id: 'k7', name: 'Анете Лиепиня', phone: '+371 26 118 550', email: 'anete@liepina.lv', visits: 6, lastVisit: '30 авг', since: 'января 2026', spent: 270, cancelled: 0, noShow: 0, flag: '', notes: '', fav: 'Окрашивание в один тон' , member: 'marta' },
    { id: 'k8', name: 'Санта Озолиня', phone: '+371 29 771 118', email: '', visits: 4, lastVisit: '1 сен', since: 'мая 2026', spent: 160, cancelled: 0, noShow: 0, flag: '', notes: '', fav: 'Педикюр с покрытием' , member: 'anna', solo: true },
    { id: 'k9', name: 'Юлия Новикова', phone: '+371 27 004 118', email: '', visits: 0, lastVisit: '', since: 'сентября 2026', spent: 0, cancelled: 0, noShow: 0, flag: '', notes: '', fav: '' , member: 'anna', solo: true },
    { id: 'k10', name: 'Эдгар Приедитис', phone: '+371 26 004 771', email: '', visits: 11, lastVisit: '8 сен', since: 'октября 2025', spent: 275, cancelled: 0, noShow: 0, flag: '', notes: '', fav: 'Мужская стрижка' , member: 'davis' },
    { id: 'k11', name: 'Элина Круминя', phone: '+371 26550118', email: '', visits: 1, lastVisit: '14 фев', since: 'февраля 2026', spent: 45, cancelled: 0, noShow: 0, flag: '', notes: '', fav: '', member: 'anna', solo: true, dup: true },
  ];

  /* Записи сегодня. start/end в минутах от полуночи. */
  P.BOOKINGS = [
    { id: 'b1', member: 'marta', client: 'k7', service: 's-color', start: 600, end: 750, status: 'completed', source: 'page', created: '3 сен, клиент', note: '' },
    { id: 'b2', member: 'anna', client: 'k8', service: 's-pedi', start: 690, end: 765, status: 'completed', source: 'master', created: '1 сен, вы', note: '' },
    { id: 'b3', member: 'davis', client: 'k10', service: 's-cut-m', start: 720, end: 765, status: 'completed', source: 'page', created: '9 сен, клиент', note: '' },
    { id: 'b4', member: 'anna', client: 'k2', service: 's-mani-gel', start: 780, end: 870, status: 'confirmed', source: 'page', created: '10 сен, клиент', note: 'Хочет нюд' },
    { id: 'b5', member: 'liene', client: 'k5', service: 's-brow', start: 810, end: 840, status: 'confirmed', source: 'master', created: '11 сен, вы', note: '' },
    { id: 'b6', member: 'anna', client: 'k1', service: 's-mani-gel', start: 870, end: 960, status: 'confirmed', source: 'page', created: '5 сен, клиент', note: 'Мягкий квадрат, без акрила' },
    { id: 'b7', member: 'davis', client: 'k3', service: 's-cut-m', start: 900, end: 945, status: 'confirmed', source: 'page', created: '11 сен, клиент', note: '' },
    { id: 'b8', member: 'liene', client: 'k4', service: 's-lami', start: 1050, end: 1110, status: 'new', source: 'page', created: 'сегодня 02:14, клиент', note: '' },
    { id: 'b9', member: 'anna', client: 'k9', service: 's-mani', start: 1110, end: 1170, status: 'new', source: 'page', created: 'сегодня 09:31, клиент', note: '' },
    { id: 'b10', member: 'davis', client: 'k6', service: 's-beard', start: 990, end: 1020, status: 'new', source: 'page', created: 'сегодня 12:05, клиент', note: '' },
    { id: 'b11', member: 'marta', client: 'k1', service: 's-cut-w', start: 1020, end: 1080, status: 'confirmed', source: 'master', created: '8 сен, вы', note: '' },
    { id: 'b12', member: 'davis', client: 'k10', service: 's-cut-m', start: 1140, end: 1185, status: 'confirmed', source: 'page', created: '10 сен, клиент', note: '' },
  ];
  /* Открытые окна и блоки сегодня */
  P.SLOTS = [
    { id: 'f1', member: 'anna', start: 960, end: 1020, hidden: false },
    { id: 'f2', member: 'anna', start: 1170, end: 1200, hidden: true },
    { id: 'f3', member: 'liene', start: 900, end: 960, hidden: false },
    { id: 'f4', member: 'liene', start: 960, end: 1020, hidden: false },
    { id: 'f5', member: 'davis', start: 1050, end: 1110, hidden: false },
    { id: 'f6', member: 'marta', start: 780, end: 900, hidden: false },
  ];
  P.BLOCKS = [
    { id: 'x1', member: 'anna', start: 600, end: 660, title: 'Обед' },
    { id: 'x2', member: 'liene', start: 600, end: 780, title: 'Нет приёма' },
    { id: 'x3', member: 'davis', start: 810, end: 870, title: 'Перерыв' },
  ];

  /* Соло-мастер: её собственный день */
  P.SOLO_BOOKINGS = [
    { id: 'n1', member: 'neve', client: 'k8', service: 's-pedi', start: 600, end: 675, status: 'completed', source: 'page', created: '4 сен, клиент', note: '' },
    { id: 'n2', member: 'neve', client: 'k2', service: 's-mani-gel', start: 690, end: 780, status: 'completed', source: 'master', created: '1 сен, вы', note: '' },
    { id: 'n3', member: 'neve', client: 'k1', service: 's-mani-gel', start: 810, end: 900, status: 'confirmed', source: 'page', created: '5 сен, клиент', note: 'Мягкий квадрат, без акрила' },
    { id: 'n4', member: 'neve', client: 'k4', service: 's-mani', start: 930, end: 990, status: 'confirmed', source: 'page', created: '10 сен, клиент', note: '' },
    { id: 'n5', member: 'neve', client: 'k9', service: 's-mani', start: 1080, end: 1140, status: 'new', source: 'page', created: 'сегодня 09:31, клиент', note: '' },
    { id: 'n6', member: 'neve', client: 'k5', service: 's-remove', start: 1140, end: 1160, status: 'new', source: 'page', created: 'сегодня 02:14, клиент', note: '' },
  ];
  P.SOLO_SLOTS = [
    { id: 'nf1', member: 'neve', start: 990, end: 1080, hidden: false },
    { id: 'nf2', member: 'neve', start: 1170, end: 1200, hidden: false },
  ];
  P.SOLO_BLOCKS = [{ id: 'nx1', member: 'neve', start: 780, end: 810, title: 'Обед' }];

  P.ACTIVITY = [
    { id: 'a1', kind: 'booked', who: 'Юлия Новикова', what: 'Маникюр классический', when: 'сегодня 09:31', unread: true },
    { id: 'a2', kind: 'booked', who: 'Лаура Витола', what: 'Ламинирование ресниц', when: 'сегодня 02:14', unread: true },
    { id: 'a3', kind: 'cancelled', who: 'Роберт Калнс', what: 'Мужская стрижка, 11 сен 18:00', when: 'вчера 21:40', unread: true },
    { id: 'a4', kind: 'booked', who: 'Инесе Заринья', what: 'Наращивание ресниц, 15 сен', when: 'вчера 14:02', unread: false },
    { id: 'a5', kind: 'booked', who: 'Мартиньш Берзиньш', what: 'Мужская стрижка, сегодня 15:00', when: '11 сен 09:12', unread: false },
  ];

  P.SOLO_ACTIVITY = [
    { id: 'sa1', kind: 'booked', who: 'Юлия Новикова', what: 'Маникюр классический, сегодня 18:00', when: 'сегодня 09:31', unread: true, booking: 'n5' },
    { id: 'sa2', kind: 'booked', who: 'Инесе Заринья', what: 'Снятие покрытия, сегодня 19:00', when: 'сегодня 02:14', unread: true, booking: 'n6' },
    { id: 'sa3', kind: 'cancelled', who: 'Роберт Калнс', what: 'Маникюр классический, 11 сен 18:00', when: 'вчера 21:40', unread: false, booking: 'n3' },
    { id: 'sa4', kind: 'booked', who: 'Элина Круминя', what: 'Маникюр с покрытием гель-лак, сегодня 13:30', when: '5 сен 14:02', unread: false, booking: 'n3' },
  ];
  P.SOLO_JOURNAL = [
    { ts: 'сегодня 09:31', who: 'Клиент', what: 'записалась', obj: 'Юлия Новикова, маникюр 18:00' },
    { ts: 'вчера 18:30', who: 'Неве Лиепа', what: 'заблокировала время', obj: '12 сен 13:00–13:30, обед' },
    { ts: '10 сен', who: 'Неве Лиепа', what: 'изменила услугу', obj: 'Педикюр с покрытием — 48 €' },
    { ts: '9 сен', who: 'Неве Лиепа', what: 'опубликовала страницу', obj: 'публикация №4' },
    { ts: '5 сен', who: 'Клиент', what: 'записалась', obj: 'Элина Круминя, гель-лак 13:30' },
  ];

  P.JOURNAL = [
    { ts: 'сегодня 12:05', who: 'Клиент', what: 'записался', obj: 'Роберт Калнс, стрижка бороды 16:30' },
    { ts: 'сегодня 11:20', who: 'Иева Озола', what: 'подтвердила запись', obj: 'Мартиньш Берзиньш, 15:00' },
    { ts: 'сегодня 09:48', who: 'Марта Калныня', what: 'изменила услугу', obj: 'Окрашивание в один тон — 90 €' },
    { ts: 'вчера 18:30', who: 'Анна Берзиня', what: 'заблокировала время', obj: '12 сен 10:00–11:00, обед' },
    { ts: '10 сен', who: 'Марта Калныня', what: 'пригласила в команду', obj: 'katrina.lapa@gmail.com, мастер' },
    { ts: '9 сен', who: 'Иева Озола', what: 'добавила клиента', obj: 'Юлия Новикова' },
  ];

  P.FINANCE = {
    month: { total: 4860, prev: 4310, avg: 41, visits: 118, cancelled: 9, noShow: 3 },
    byMonth: [
      { m: 'окт', v: 2900 }, { m: 'ноя', v: 3300 }, { m: 'дек', v: 4100 }, { m: 'янв', v: 2700 }, { m: 'фев', v: 3150 }, { m: 'мар', v: 3600 },
      { m: 'апр', v: 3900 }, { m: 'май', v: 4200 }, { m: 'июн', v: 4550 }, { m: 'июл', v: 4020 }, { m: 'авг', v: 4310 }, { m: 'сен', v: 4860 },
    ],
    byService: [
      { name: 'Маникюр с покрытием гель-лак', n: 34, v: 1530 }, { name: 'Окрашивание в один тон', n: 11, v: 990 }, { name: 'Наращивание ресниц, классика', n: 14, v: 770 },
      { name: 'Мужская стрижка', n: 25, v: 625 }, { name: 'Педикюр с покрытием', n: 9, v: 432 }, { name: 'Женская стрижка', n: 10, v: 350 },
    ],
    byMember: [
      { id: 'anna', n: 46, v: 2010, avg: 44 }, { id: 'marta', n: 24, v: 1420, avg: 59 }, { id: 'davis', n: 33, v: 830, avg: 25 }, { id: 'liene', n: 15, v: 600, avg: 40 },
    ],
    completed: [
      { d: '12 сен', t: '12:00', client: 'Эдгар Приедитис', svc: 'Мужская стрижка', member: 'davis', v: 25 },
      { d: '12 сен', t: '11:30', client: 'Санта Озолиня', svc: 'Педикюр с покрытием', member: 'anna', v: 48 },
      { d: '12 сен', t: '10:00', client: 'Анете Лиепиня', svc: 'Окрашивание в один тон', member: 'marta', v: 90 },
      { d: '11 сен', t: '18:00', client: 'Инесе Заринья', svc: 'Ламинирование ресниц', member: 'liene', v: 40 },
      { d: '11 сен', t: '16:30', client: 'Элина Круминя', svc: 'Маникюр с покрытием гель-лак', member: 'anna', v: 45 },
      { d: '11 сен', t: '14:00', client: 'Мартиньш Берзиньш', svc: 'Мужская стрижка', member: 'davis', v: 25 },
      { d: '11 сен', t: '12:00', client: 'Дарья Соколова', svc: 'Маникюр с покрытием гель-лак', member: 'anna', v: 45 },
    ],
  };
  P.SOLO_FINANCE = {
    total: 1566, prev: 1490, avg: 37, visits: 42, cancelled: 3, noShow: 1,
    byMonth: [{ m: 'апр', v: 1180 }, { m: 'май', v: 1290 }, { m: 'июн', v: 1420 }, { m: 'июл', v: 1310 }, { m: 'авг', v: 1490 }, { m: 'сен', v: 1566 }],
    byService: [
      { name: 'Маникюр с покрытием гель-лак', n: 22, v: 990 }, { name: 'Педикюр с покрытием', n: 6, v: 288 },
      { name: 'Маникюр классический', n: 8, v: 240 }, { name: 'Снятие покрытия', n: 6, v: 48 },
    ],
    completed: [
      { d: '12 сен', t: '11:30', client: 'Дарья Соколова', svc: 'Маникюр с покрытием гель-лак', member: 'neve', v: 45 },
      { d: '12 сен', t: '10:00', client: 'Санта Озолиня', svc: 'Педикюр с покрытием', member: 'neve', v: 48 },
      { d: '11 сен', t: '17:00', client: 'Элина Круминя', svc: 'Маникюр с покрытием гель-лак', member: 'neve', v: 45 },
      { d: '11 сен', t: '15:00', client: 'Лаура Витола', svc: 'Маникюр классический', member: 'neve', v: 30 },
      { d: '10 сен', t: '18:30', client: 'Юлия Новикова', svc: 'Снятие покрытия', member: 'neve', v: 8 },
      { d: '10 сен', t: '12:00', client: 'Дарья Соколова', svc: 'Маникюр классический', member: 'neve', v: 30 },
      { d: '9 сен', t: '16:00', client: 'Элина Круминя', svc: 'Маникюр с покрытием гель-лак', member: 'neve', v: 45 },
    ],
  };

  P.PAYOUTS = [
    { id: 'p1', member: 'anna', period: 'Август 2026', visits: 52, revenue: 2260, toMaster: 1130, toSalon: 1130, status: 'approved', terms: '50% от дохода' },
    { id: 'p2', member: 'liene', period: 'Август 2026', visits: 21, revenue: 860, toMaster: 430, toSalon: 430, status: 'paid', terms: '50% от дохода' },
    { id: 'p3', member: 'davis', period: 'Август 2026', visits: 39, revenue: 990, toMaster: 590, toSalon: 400, status: 'draft', terms: 'аренда 400 € в месяц' },
    { id: 'p4', member: 'anna', period: 'Июль 2026', visits: 48, revenue: 2080, toMaster: 1040, toSalon: 1040, status: 'paid', terms: '50% от дохода' },
    { id: 'p5', member: 'davis', period: 'Июль 2026', visits: 35, revenue: 880, toMaster: 480, toSalon: 400, status: 'paid', terms: 'аренда 400 € в месяц' },
  ];

  /* Панель платформы */
  P.ADMIN = {
    kpis: { masters: 214, mastersPublished: 168, orgs: 61, orgsWithServices: 54, clients: 3812, bookingsWeek: 1264, bookingsWeekDelta: 8, subs: 47, bookingsTotal: 28190, requests: 6 },
    weeks: [820, 870, 910, 960, 1020, 990, 1080, 1130, 1100, 1170, 1210, 1264],
    sparks: { masters: [150, 154, 166, 163, 178, 188, 184, 199, 214], clients: [2100, 2310, 2280, 2640, 2870, 3060, 3010, 3390, 3812], orgs: [38, 40, 44, 43, 49, 52, 55, 57, 61], subs: [28, 30, 29, 34, 36, 40, 39, 44, 47] },
    funnel: [{ k: 'Зарегистрировались', n: 214 }, { k: 'Добавили услуги', n: 187 }, { k: 'Открыли окна', n: 175 }, { k: 'Опубликовали страницу', n: 168 }, { k: 'Получили первую запись', n: 142 }],
    masters: [
      { id: 'm1', name: 'Неве Лиепа', email: 'neve@nevenails.lv', org: 'Neve Nails', slug: 'neve', type: 'solo', status: 'active', page: true, published: '9 сен 2026', created: '14 фев 2026', createdIso: '2026-02-14', bookings: 312, bookings30: 58, cancelled30: 4, sub: 'active', plan: 'Соло', subStart: '3 апр 2026', subRenew: '3 окт 2026', services: '4 в 1 категории', styleId: 'soft', phone: '+371 26 771 004', note: 'Спрашивала про перенос визита клиентом — функция вышла 5 сентября, написали ей.', events: [['сегодня 09:31', 'Клиент', 'записалась со страницы', 'Юлия Новикова, 18:00'], ['9 сен', 'Мастер', 'опубликовала страницу', 'публикация №4'], ['3 сен', 'Система', 'продлила подписку', 'Соло · 12 €'], ['14 фев', 'Мастер', 'завела кабинет', 'по заявке']] },
      { id: 'm2', name: 'Марта Калныня', email: 'marta@lumen.lv', org: 'Lumen Studio', slug: 'lumen-studio', type: 'salon', status: 'active', page: true, published: '9 сен 2026', created: '3 мар 2025', createdIso: '2025-03-03', bookings: 2140, bookings30: 412, cancelled30: 31, sub: 'active', plan: 'Салон', subStart: '3 апр 2025', subRenew: '3 окт 2026', services: '12 в 3 категориях', styleId: 'soft', phone: '+371 26 411 902', note: 'Просила добавить второй адрес для филиала — ждём функцию нескольких точек.', events: [['сегодня 11:20', 'Андрис', 'вошёл в кабинет', 'режим поддержки'], ['9 сен', 'Владелица', 'опубликовала страницу', 'публикация №4'], ['3 сен', 'Система', 'продлила подписку', 'Салон · 39 €'], ['28 авг', 'Владелица', 'сменила публичный адрес', 'lumen → lumen-studio']] },
      { id: 'm3', name: 'Илзе Крауя', email: 'ilze.k@gmail.com', org: 'Ilze Brows', slug: 'ilze-brows', type: 'solo', status: 'active', page: false, published: '', created: '9 сен 2026', createdIso: '2026-09-09', bookings: 0, bookings30: 0, cancelled30: 0, sub: 'none', plan: '', subStart: '', subRenew: '', services: 'ещё нет', styleId: '', phone: '+371 26 118 002', note: '', events: [['9 сен', 'Андрис', 'одобрил заявку', 'кабинет создан']] },
      { id: 'm4', name: 'Артур Вилкс', email: 'arturs@formbarbers.lv', org: 'Form Barbers', slug: 'form-barbers', type: 'salon', status: 'active', page: true, published: '2 сен 2026', created: '22 окт 2025', createdIso: '2025-10-22', bookings: 1876, bookings30: 210, cancelled30: 18, sub: 'frozen', plan: 'Салон', subStart: '22 ноя 2025', subRenew: '22 сен 2026', services: '9 в 2 категориях', styleId: 'poster', phone: '+371 29 340 118', note: 'Платёж не прошёл дважды — подписка заморожена автоматически.', events: [['10:03', 'Система', 'заморозила подписку', 'платёж не прошёл'], ['2 сен', 'Владелец', 'опубликовал страницу', 'публикация №7']] },
      { id: 'm5', name: 'Дана Спроге', email: 'dana.s@inbox.lv', org: 'Dana Lashes', slug: 'dana-lashes', type: 'solo', status: 'blocked', page: true, published: '15 июн 2026', created: '2 июн 2026', createdIso: '2026-06-02', bookings: 41, bookings30: 0, cancelled30: 0, sub: 'cancelled', plan: 'Соло', subStart: '2 июл 2026', subRenew: '2 авг 2026', services: '5 в 1 категории', styleId: 'aura', phone: '+371 27 660 003', note: 'Жалобы клиентов на неявку мастера. Заблокирована 30 июля.', events: [['30 июл', 'Андрис', 'заблокировал аккаунт', 'по жалобам'], ['15 июн', 'Мастер', 'опубликовала страницу', 'публикация №1']] },
      { id: 'm6', name: 'Кристап Роза', email: 'k.roza@studio-nara.lv', org: 'Studio Nara', slug: 'studio-nara', type: 'salon', status: 'active', page: true, published: '1 сен 2026', created: '18 апр 2025', createdIso: '2025-04-18', bookings: 3320, bookings30: 590, cancelled30: 44, sub: 'active', plan: 'Салон, год', subStart: '18 май 2025', subRenew: '18 май 2027', services: '21 в 5 категориях', styleId: 'luxury', phone: '+371 28 110 445', note: '', events: [['12:58', 'Владелец', 'пригласил в команду', 'седьмой мастер'], ['1 сен', 'Владелец', 'опубликовал страницу', 'публикация №12']] },
      { id: 'm7', name: 'Лига Пумпуре', email: 'liga.p@gmail.com', org: 'Liga Nails', slug: 'liga-nails', type: 'solo', status: 'active', page: false, published: '', created: '12 сен 2026', createdIso: '2026-09-12', bookings: 0, bookings30: 0, cancelled30: 0, sub: 'none', plan: '', subStart: '', subRenew: '', services: 'ещё нет', styleId: '', phone: '+371 27 004 118', note: '', events: [['13:40', 'Андрис', 'одобрил заявку', 'кабинет создан']] },
      { id: 'm8', name: 'Зане Берзиня', email: 'zane@zanenails.lv', org: 'Zane Nails', slug: 'zane-nails', type: 'solo', status: 'active', page: true, published: '20 авг 2026', created: '11 авг 2026', createdIso: '2026-08-11', bookings: 27, bookings30: 27, cancelled30: 1, sub: 'active', plan: 'Соло', subStart: '11 сен 2026', subRenew: '11 окт 2026', services: '6 в 2 категориях', styleId: 'minimal', phone: '+371 26 771 900', note: '', events: [['20 авг', 'Мастер', 'опубликовала страницу', 'публикация №1']] },
      { id: 'm9', name: 'Томс Эглитис', email: 'toms.e@inbox.lv', org: 'Toms Barber', slug: 'toms-barber', type: 'solo', status: 'active', page: true, published: '4 июл 2026', created: '30 июн 2026', createdIso: '2026-06-30', bookings: 118, bookings30: 46, cancelled30: 3, sub: 'active', plan: 'Соло', subStart: '30 июл 2026', subRenew: '30 сен 2026', services: '4 в 1 категории', styleId: 'funk', phone: '+371 29 008 771', note: '', events: [['4 июл', 'Мастер', 'опубликовал страницу', 'публикация №1']] },
      { id: 'm10', name: 'Эва Калниня', email: 'eva@myata.lv', org: 'Салон «Мята»', slug: 'myata', type: 'salon', status: 'active', page: true, published: '30 авг 2026', created: '20 авг 2026', createdIso: '2026-08-20', bookings: 64, bookings30: 64, cancelled30: 2, sub: 'active', plan: 'Салон', subStart: '20 сен 2026', subRenew: '20 окт 2026', services: '14 в 3 категориях', styleId: 'soft', phone: '+371 29 002 118', note: 'Переезжают с телефонной записи, попросили импорт клиентов из таблицы.', events: [['30 авг', 'Владелица', 'опубликовала страницу', 'публикация №2']] },
      { id: 'm11', name: 'Рута Озола', email: 'ruta.o@inbox.lv', org: 'Ruta Brows', slug: 'ruta-brows', type: 'solo', status: 'active', page: true, published: '12 мая 2026', created: '5 мая 2026', createdIso: '2026-05-05', bookings: 203, bookings30: 71, cancelled30: 5, sub: 'active', plan: 'Соло', subStart: '5 июн 2026', subRenew: '5 окт 2026', services: '5 в 1 категории', styleId: 'aura', phone: '+371 26 550 990', note: '', events: [['12 мая', 'Мастер', 'опубликовала страницу', 'публикация №1']] },
      { id: 'm12', name: 'Янис Лиепа', email: 'janis@cutclub.lv', org: 'Cut Club', slug: 'cut-club', type: 'salon', status: 'active', page: true, published: '15 мар 2026', created: '2 мар 2026', createdIso: '2026-03-02', bookings: 740, bookings30: 188, cancelled30: 12, sub: 'active', plan: 'Салон', subStart: '2 апр 2026', subRenew: '2 окт 2026', services: '8 в 2 категориях', styleId: 'poster', phone: '+371 28 400 216', note: '', events: [['15 мар', 'Владелец', 'опубликовал страницу', 'публикация №1']] },
    ],
    requests: [
      { id: 'r1', name: 'Илзе Крауя', email: 'ilze.k@gmail.com', phone: '+371 26 118 002', type: 'master', city: 'Рига', lang: 'LV', when: 'сегодня 08:12', msg: 'Брови и ресницы, 6 лет опыта, работаю в центре Риги. Instagram: @ilze.brows', emailFree: true },
      { id: 'r2', name: 'Салон «Мята»', email: 'hello@myata.lv', phone: '+371 29 002 118', type: 'salon', city: 'Юрмала', lang: 'RU', when: 'вчера 19:40', msg: 'Салон на 4 кресла, хотим перевести запись с телефона на онлайн.', emailFree: true },
      { id: 'r3', name: 'Томс Эглитис', email: 'toms.e@inbox.lv', phone: '', type: 'master', city: 'Лиепая', lang: 'LV', when: 'вчера 11:05', msg: '', emailFree: false },
      { id: 'r4', name: 'Beauty Corner', email: 'info@beautycorner.ee', phone: '+372 5 118 0021', type: 'salon', city: 'Таллин', lang: 'EN', when: '10 сен', msg: 'We run two locations in Tallinn and want a booking page for both.', emailFree: true },
      { id: 'r5', name: 'Лига Пумпуре', email: 'liga.p@gmail.com', phone: '+371 27 004 118', type: 'master', city: 'Рига', lang: 'LV', when: '10 сен', msg: 'Маникюр на дому, хочу страницу для Instagram.', emailFree: true },
      { id: 'r6', name: 'Zane Nails', email: 'zane@zanenails.lv', phone: '+371 26 771 900', type: 'master', city: 'Валмиера', lang: 'LV', when: '9 сен', msg: '', emailFree: true },
    ],
    users: [
      { name: 'Элина Круминя', contact: 'elina.k@inbox.lv', role: 'client', last: '11 сен 2026', lastIso: '2026-09-11', signed: '12 марта 2025', blocked: false },
      { name: 'Марта Калныня', contact: 'marta@lumen.lv', role: 'master', last: '12 сен 2026', lastIso: '2026-09-12', signed: '3 марта 2025', blocked: false },
      { name: 'Андрис Лиепиньш', contact: 'andris@amolie.com', role: 'platform', last: 'сегодня', lastIso: '2026-09-12', signed: '1 февраля 2025', blocked: false, self: true },
      { name: 'Кристап Роза', contact: 'k.roza@studio-nara.lv', role: 'master', last: '12 сен 2026', lastIso: '2026-09-12', signed: '18 апреля 2025', blocked: false },
      { name: 'Анете Лиепиня', contact: 'anete@liepina.lv', role: 'client', last: '12 сен 2026', lastIso: '2026-09-12', signed: '9 января 2026', blocked: false },
      { name: 'Артур Вилкс', contact: 'arturs@formbarbers.lv', role: 'master', last: '11 сен 2026', lastIso: '2026-09-11', signed: '22 октября 2025', blocked: false },
      { name: 'Санта Озолиня', contact: '+371 29 771 118', role: 'client', last: '12 сен 2026', lastIso: '2026-09-12', signed: '3 мая 2026', blocked: false },
      { name: 'Илзе Крауя', contact: 'ilze.k@gmail.com', role: 'master', last: 'ни одной', lastIso: '2000-01-01', signed: '9 сентября 2026', blocked: false },
      { name: 'Эдгар Приедитис', contact: 'edgars.p@inbox.lv', role: 'client', last: '12 сен 2026', lastIso: '2026-09-12', signed: '14 октября 2025', blocked: false },
      { name: 'Лаура Витола', contact: '+371 26 771 003', role: 'client', last: '12 сен 2026', lastIso: '2026-09-12', signed: '11 сентября 2026', blocked: false },
      { name: 'Роберт Калнс', contact: '+371 28 900 216', role: 'client', last: '20 авг 2026', lastIso: '2026-08-20', signed: '20 августа 2026', blocked: false },
      { name: 'Дана Спроге', contact: 'dana.s@inbox.lv', role: 'master', last: '30 июл 2026', lastIso: '2026-07-30', signed: '2 июня 2026', blocked: true },
    ],
    orgs: [
      { name: 'Lumen Studio', owner: 'Марта Калныня', team: 5, bookings30: 412, status: 'active', plan: 'Салон' },
      { name: 'Studio Nara', owner: 'Кристап Роза', team: 7, bookings30: 590, status: 'active', plan: 'Салон' },
      { name: 'Form Barbers', owner: 'Артур Вилкс', team: 3, bookings30: 210, status: 'suspended', plan: 'Салон' },
      { name: 'Neve Nails', owner: 'Неве Лиепа', team: 1, bookings30: 58, status: 'active', plan: 'Соло' },
      { name: 'Dana Lashes', owner: 'Дана Спроге', team: 1, bookings30: 0, status: 'archived', plan: '' },
      { name: 'Салон «Мята»', owner: 'Эва Калниня', team: 4, bookings30: 64, status: 'active', plan: 'Салон' },
      { name: 'Cut Club', owner: 'Янис Лиепа', team: 3, bookings30: 188, status: 'active', plan: 'Салон' },
      { name: 'Zane Nails', owner: 'Зане Берзиня', team: 1, bookings30: 27, status: 'active', plan: 'Соло' },
      { name: 'Toms Barber', owner: 'Томс Эглитис', team: 1, bookings30: 46, status: 'active', plan: 'Соло' },
      { name: 'Ruta Brows', owner: 'Рута Озола', team: 1, bookings30: 71, status: 'active', plan: 'Соло' },
      { name: 'Ilze Brows', owner: 'Илзе Крауя', team: 1, bookings30: 0, status: 'active', plan: '' },
      { name: 'Liga Nails', owner: 'Лига Пумпуре', team: 1, bookings30: 0, status: 'active', plan: '' },
    ],
    subs: [
      { org: 'Lumen Studio', plan: 'Салон', price: '39 € / мес', started: '3 апреля 2025', renews: '3 октября 2026', status: 'active', renewsIso: '2026-10-03' },
      { org: 'Studio Nara', plan: 'Салон, год', price: '390 € / год', started: '18 мая 2025', renews: '18 мая 2027', status: 'active', renewsIso: '2027-05-18' },
      { org: 'Form Barbers', plan: 'Салон', price: '39 € / мес', started: '22 ноября 2025', renews: '22 сентября 2026', status: 'frozen', renewsIso: '2026-09-22' },
      { org: 'Neve Nails', plan: 'Соло', price: '12 € / мес', started: '3 апреля 2026', renews: '3 октября 2026', status: 'active', renewsIso: '2026-10-03' },
      { org: 'Dana Lashes', plan: 'Соло', price: '12 € / мес', started: '2 июля 2026', renews: '2 августа 2026', status: 'cancelled', renewsIso: '2026-08-02' },
      { org: 'Салон «Мята»', plan: 'Салон', price: '39 € / мес', started: '20 сентября 2026', renews: '20 октября 2026', status: 'active', renewsIso: '2026-10-20' },
      { org: 'Cut Club', plan: 'Салон', price: '39 € / мес', started: '2 апреля 2026', renews: '2 октября 2026', status: 'active', renewsIso: '2026-10-02' },
      { org: 'Zane Nails', plan: 'Соло', price: '12 € / мес', started: '11 сентября 2026', renews: '11 октября 2026', status: 'active', renewsIso: '2026-10-11' },
      { org: 'Toms Barber', plan: 'Соло', price: '12 € / мес', started: '30 июля 2026', renews: '30 сентября 2026', status: 'active', renewsIso: '2026-09-30' },
      { org: 'Ruta Brows', plan: 'Соло', price: '12 € / мес', started: '5 июня 2026', renews: '5 октября 2026', status: 'active', renewsIso: '2026-10-05' },
    ],
    announcements: [
      { title: 'Плановые работы 14 сентября, 03:00–04:00', audience: 'Всем', from: '13 сен', to: '14 сен', state: 'scheduled', author: 'Андрис', read: 0 },
      { title: 'Новое: перенос визита клиентом', audience: 'Салонам', from: '5 сен', to: '', state: 'live', author: 'Андрис', read: 38 },
      { title: 'Обновили письма-напоминания', audience: 'Всем', from: '20 авг', to: '30 авг', state: 'ended', author: 'Андрис', read: 171 },
      { title: 'Оплата картой в кабинете — с 1 октября', audience: 'Всем', from: '25 сен', to: '10 окт', state: 'scheduled', author: 'Андрис', read: 0 },
      { title: 'Новые стили оформления: «Люкс» и «Фанк»', audience: 'Всем', from: '1 авг', to: '15 авг', state: 'ended', author: 'Андрис', read: 190 },
      { title: 'Ведомости выплат для салонов', audience: 'Салонам', from: '10 июл', to: '24 июл', state: 'ended', author: 'Андрис', read: 44 },
    ],
    health: [
      { k: 'База данных', s: 'ok', lat: '12 мс', d: 'Отвечает.', t: 'только что' },
      { k: 'Почта', s: 'ok', lat: '340 мс', d: 'Настроена — письма уходят.', t: '20 с назад' },
      { k: 'Уведомления', s: 'warn', lat: '—', d: 'Найдут 2 из 3 администраторов — остальным нужно включить уведомления в настройках панели.', t: '20 с назад' },
      { k: 'Очередь заявок', s: 'ok', lat: '—', d: 'Ждут ответа: 6.', t: 'только что' },
      { k: 'Фоновые задачи', s: 'ok', lat: '—', d: 'В работе: 4. Письма и напоминания уходят по очереди.', t: '5 с назад' },
      { k: 'Активность за сутки', s: 'ok', lat: '—', d: 'Записей за последние 24 часа: 183.', t: 'только что' },
    ],
    logs: [
      { ts: '13:40', who: 'Андрис', what: 'одобрил заявку', obj: 'Лига Пумпуре', sev: 'info' },
      { ts: '13:12', who: 'Система', what: 'не отправлено после всех попыток', obj: 'письмо-напоминание, Form Barbers', sev: 'warn' },
      { ts: '12:58', who: 'Марта Калныня', what: 'пригласила в команду', obj: 'katrina.lapa@gmail.com', sev: 'info' },
      { ts: '11:20', who: 'Андрис', what: 'вошёл в кабинет мастера', obj: 'Dana Lashes', sev: 'warn' },
      { ts: '10:03', who: 'Система', what: 'заморозила подписку', obj: 'Form Barbers', sev: 'warn' },
      { ts: '09:41', who: 'Андрис', what: 'опубликовал объявление', obj: 'Плановые работы 14 сентября', sev: 'info' },
      { ts: '09:12', who: 'Эва Калниня', what: 'опубликовала страницу', obj: 'Салон «Мята», публикация №3', sev: 'info' },
      { ts: '08:47', who: 'Система', what: 'продлила подписку', obj: 'Zane Nails · Соло', sev: 'info' },
      { ts: '08:12', who: 'Илзе Крауя', what: 'подала заявку', obj: 'мастер, Рига', sev: 'info' },
      { ts: 'вчера 22:10', who: 'Система', what: 'отправила напоминания', obj: '183 письма', sev: 'info' },
      { ts: 'вчера 19:40', who: 'Салон «Мята»', what: 'подала заявку', obj: 'салон, Юрмала', sev: 'info' },
    ],
  };

  P.WORLDS = [
    { id: 'soft', name: 'Мягкий', desc: 'Матовое стекло, скругления и мягкие тени', bg: 'linear-gradient(135deg,#f7eef2,#e8dcef)', ink: '#3a2a35' },
    { id: 'poster', name: 'Плакат', desc: 'Плоские цветовые поля, жёсткие линейки, прямые углы', bg: '#1b2a6b', ink: '#f4efe6' },
    { id: 'luxury', name: 'Люкс', desc: 'Грейж-разворот, чернильные швы и бронза', bg: '#d9d0c8', ink: '#2b2622' },
    { id: 'aura', name: 'Аура', desc: 'Перламутровое стекло, аврора и градиент розы в лиловый', bg: 'linear-gradient(120deg,#f6d6e4,#cbb8ee,#dcecf5)', ink: '#3b2452' },
    { id: 'funk', name: 'Фанк', desc: 'Чертёжная сетка, жёсткие тени и кислотные акценты', bg: 'repeating-linear-gradient(0deg,#fbfbf6 0 11px,#e4e4d6 11px 12px),#fbfbf6', ink: '#1a1a1a' },
    { id: 'minimal', name: 'Минимал', desc: 'Почти белая земля, крупные скругления и один синий акцент', bg: '#fafafa', ink: '#1f6fd6' },
  ];
})(window.P);

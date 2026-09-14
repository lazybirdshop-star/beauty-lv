/* Панель платформы: сводка, мастера, салоны, пользователи, заявки, записи, подписки, объявления, состояние, логи, настройки. */
(function (P) {
  const { icon, btn, esc, act, cellHead, status, avatar, eur } = P;
  const A = P.ADMIN;
  const filters = (search, sels) => `<div class="filters"><div class="input-wrap grow">${icon('search', 'lead')}${P.input({ placeholder: search, cls: 'inline' })}</div>${btn('Фильтры', { size: 'sm', variant: 'secondary', icon: 'filter', cls: 'filters-toggle', action: 'toggleUi', args: { key: 'admFilters' } })}<div class="filters-list ${(P.state.ui || {}).admFilters ? 'open' : ''}">${sels.map(([opts, v]) => P.select(opts, v)).join('')}</div></div>`;
  const pager = (from, to, total) => `<div class="pager"><span>${P.num(from)}–${P.num(to)} из ${P.num(total)}</span><div class="btns">${btn('Назад', { size: 'xs', variant: 'ghost', disabled: true })}${btn('Далее', { size: 'xs', variant: 'ghost' })}</div></div>`;
  const rowMenu = (name, id) => btn('', { size: 'xs', variant: 'ghost', icon: 'more', title: 'Действия со строкой', action: 'menuAt', args: { name, id } });

  P.SCREENS['admin-home'] = {
    title: 'Сводка', hint: 'Платформа за 30 дней',
    actions: () => P.seg([['7', '7 дней'], ['30', '30 дней'], ['90', '90 дней']], '30', 'noop'),
    render() {
      const k = A.kpis;
      return `
      <div class="grid c12">
        <section class="cell rose span-12"><div class="row between wrap"><div><div class="t-section">${P.countOf(k.requests, ['заявка ждёт', 'заявки ждут', 'заявок ждут'])} ответа</div><div class="t-hint mt8">Пока заявка не разобрана, мастер ждёт. Самая старая — 9 сентября.</div></div>${btn('Открыть очередь', { variant: 'primary', size: 'sm', icon: 'inbox', action: 'nav', args: { name: 'admin-requests' } })}</div></section>
        <section class="cell span-3"><div class="stat"><div class="k">Мастера</div><div class="v">${k.masters}</div><div class="d">${k.mastersPublished} с опубликованной страницей</div></div><div class="kpi-spark">${P.spark(A.sparks.masters)}</div></section>
        <section class="cell span-3"><div class="stat"><div class="k">Организации</div><div class="v">${k.orgs}</div><div class="d">${k.orgsWithServices} с заведёнными услугами</div></div><div class="kpi-spark">${P.spark(A.sparks.orgs)}</div></section>
        <section class="cell span-3"><div class="stat"><div class="k">Клиенты</div><div class="v">${P.num(k.clients)}</div><div class="d">аккаунтов на страницах записи</div></div><div class="kpi-spark">${P.spark(A.sparks.clients)}</div></section>
        <section class="cell span-3"><div class="stat"><div class="k">Активные подписки</div><div class="v">${k.subs}</div><div class="d">из ${P.countOf(k.orgs, ['организации', 'организаций', 'организаций'])}</div></div><div class="kpi-spark">${P.spark(A.sparks.subs)}</div></section>
        <section class="cell span-7">${cellHead('Записи по неделям', '12 недель · все мастера и салоны')}<div class="quiet-chart">${P.bars(A.weeks.map((v, i) => ({ m: ['22 июн', '', '6 июл', '', '20', '', '3 авг', '', '17', '', '31', '7 сен'][i], v })), { label: 'Записи по неделям', fmt: (v) => P.num(v) })}</div><div class="t-meta mt12">Неделя с 7 сентября: ${P.countOf(k.bookingsWeek, ['запись', 'записи', 'записей'])} · +${k.bookingsWeekDelta}% к прошлой неделе</div></section>
        <section class="cell span-5">${cellHead('Путь мастера', 'От регистрации до первой записи, за всё время')}<div class="funnel quiet-chart">${A.funnel.map((f) => `<div class="f"><span>${f.k}</span><div class="bar" style="width:${(f.n / A.funnel[0].n) * 100}%"></div><span class="n">${P.num(f.n)}</span></div>`).join('')}</div><div class="t-meta mt12">Работают последние 30 дней: 171</div></section>
        <section class="cell span-4"><div class="stat"><div class="k">Регистрации · за 30 дней</div><div class="v">23</div><div class="d up">+15% к прошлому</div></div></section>
        <section class="cell span-4"><div class="stat"><div class="k">Записи</div><div class="v">${P.num(k.bookingsTotal)}</div><div class="d">всего создано</div></div></section>
        <section class="cell span-4">${cellHead('Состояние платформы', 'База, почта, уведомления и очередь задач', { label: 'Подробнее', action: 'nav', args: { name: 'admin-health' } })}<div class="row wrap">${A.health.slice(0, 5).map((h) => `<span class="status ${h.s}" title="${esc(h.k)}">${esc(h.k)}</span>`).join('')}</div></section>
      </div>`;
    },
  };

  P.SCREENS['admin-masters'] = {
    title: 'Мастера', hint: '214 · 9 новых за неделю',
    actions: () => btn('Выгрузить CSV', { variant: 'ghost', icon: 'download', action: 'toast', args: { msg: 'Файл masters.csv скачивается' } }),
    render() {
      return `<section class="cell">
        ${filters('Имя, почта или салон', [[[['all', 'Статус: все'], ['active', 'Активные'], ['blocked', 'Заблокированные']], 'all'], [[['all', 'Страница: любая'], ['pub', 'Опубликована'], ['draft', 'Черновик']], 'all'], [[['all', 'Подписка: любая'], ['active', 'Активна'], ['none', 'Нет']], 'all'], [[['all', 'За всё время'], ['7', '7 дней'], ['30', '30 дней']], 'all']])}
        <div class="table-wrap"><table class="table responsive"><thead><tr><th>Мастер</th><th>Статус</th><th>Страница</th><th>Регистрация ↓</th><th class="r">Записи</th><th>Подписка</th><th></th><th></th></tr></thead>
        <tbody>${[...A.masters].sort((a, b) => (a.createdIso < b.createdIso ? 1 : -1)).map((m) => `<tr class="click"${act('nav', { name: 'admin-master', id: m.id })}><td><div class="cellname">${avatar({ name: m.name, tone: m.type === 'solo' ? 'm1' : 'm2' }, 'sm')}<div><b>${esc(m.name)}</b><small class="m-only">${esc(m.org)} · ${m.type === 'solo' ? 'мастер' : 'салон'} · записей ${P.num(m.bookings)}</small><small class="hide-m">${esc(m.email)} · ${esc(m.org)}</small></div></div></td><td class="hide-m">${status(m.status === 'active' ? 'ok' : 'blocked', m.status === 'active' ? 'Активен' : 'Заблокирован')}</td><td class="hide-m">${m.page ? 'Опубликована' : '<span class="muted">Черновик</span>'}</td><td class="hide-m num">${m.created}</td><td class="r num hide-m">${P.num(m.bookings)}</td><td class="hide-m">${m.sub === 'none' ? '<span class="muted">Нет</span>' : status(m.sub, { active: 'Активна', frozen: 'Заморожена', cancelled: 'Отменена' }[m.sub])}</td><td class="r hide-m">${rowMenu('adminMaster', m.id)}</td><td class="m-right m-only">${status(m.status === 'active' ? 'ok' : 'blocked', m.status === 'active' ? 'Активен' : 'Заблокирован')}</td></tr>`).join('')}</tbody></table></div>
        ${pager(1, A.masters.length, 214)}
      </section>`;
    },
  };

  P.SCREENS['admin-master'] = {
    title: (st) => A.masters.find((m) => m.id === st.route.id).name, hint: (st) => `${A.masters.find((m) => m.id === st.route.id).org} · зарегистрирована ${A.masters.find((m) => m.id === st.route.id).created}`, back: 'admin-masters', crumb: 'Мастера',
    actions: (st) => btn('Написать', { variant: 'ghost', icon: 'mail', action: 'toast', args: { msg: 'Открыли бы письмо' } }) + btn('', { variant: 'ghost', icon: 'more', title: 'Ещё', action: 'menuAt', args: { name: 'adminMaster', id: st.route.id } }) + btn('Войти в кабинет', { variant: 'primary', icon: 'eye', action: 'dialog', args: { name: 'impersonate', id: st.route.id } }),
    render(st) {
      const m = A.masters.find((x) => x.id === st.route.id);
      return `<div class="grid c12 top">
        <section class="cell span-4">${cellHead('Аккаунт', '')}<dl class="kv"><dt>Роль</dt><dd>${m.type === 'solo' ? 'Мастер · одна' : 'Владелец салона'}</dd><dt>Email</dt><dd>${esc(m.email)} <span class="muted">· подтверждён</span></dd><dt>Телефон</dt><dd class="num">${esc(m.phone)}</dd><dt>Язык и пояс</dt><dd>LV · Europe/Riga</dd><dt>Заведён</dt><dd>${m.created}</dd><dt>Статус</dt><dd>${status(m.status === 'active' ? 'ok' : 'blocked', m.status === 'active' ? 'Активен' : 'Заблокирован')}</dd></dl></section>
        <section class="cell span-4">${cellHead('Публичная страница', '', m.page ? { label: 'Открыть страницу', action: 'toast', args: { msg: 'Открыли бы страницу' } } : null)}<dl class="kv"><dt>Адрес</dt><dd>amolie.com/${esc(m.slug)}</dd><dt>Опубликована</dt><dd>${m.page ? m.published : '<span class="muted">ни разу</span>'}</dd><dt>Услуги</dt><dd>${m.services}</dd><dt>Оформление</dt><dd>${P.worldName(m.styleId)}</dd><dt>Настройка</dt><dd>${m.page ? 'пройдена' : 'не закончена'}</dd></dl></section>
        <section class="cell lilac span-4">${cellHead('Подписка', '', { label: 'Сменить тариф', action: 'sheet', args: { name: 'assignPlan', org: m.org } })}<dl class="kv"><dt>Тариф</dt><dd>${m.plan || '<span class="muted">не назначен</span>'}</dd><dt>Состояние</dt><dd>${m.sub === 'none' ? 'Без подписки' : { active: 'Активна', frozen: 'Заморожена', cancelled: 'Отменена' }[m.sub]}</dd>${m.subStart ? `<dt>Начата</dt><dd>${m.subStart}</dd><dt>${m.sub === 'cancelled' ? 'Закончилась' : 'Продление'}</dt><dd>${m.subRenew}</dd>` : ''}</dl></section>
        <div class="span-4 grid c3 keep-halves"><section class="cell"><div class="stat"><div class="k">Записей всего</div><div class="v">${P.num(m.bookings)}</div></div></section><section class="cell"><div class="stat"><div class="k">За 30 дней</div><div class="v">${P.num(m.bookings30)}</div></div></section><section class="cell"><div class="stat"><div class="k">Отменено за 30 дней</div><div class="v">${P.num(m.cancelled30)}</div></div></section></div>
        <section class="cell span-8">${cellHead('Что происходило', '', { label: 'В журнал', action: 'nav', args: { name: 'admin-logs' } })}<div class="list">${m.events.map(([t, w, x, o]) => `<div class="log-row"><span class="ts">${t}</span><span><span class="who">${w}</span> <span class="what">${x}</span><br><span class="obj">${o}</span></span><span></span></div>`).join('')}</div></section>
        <section class="cell span-8">${cellHead('Заметка платформы', 'Мастер этого не видит')}${P.textarea({ placeholder: 'Что помнит поддержка об этом аккаунте.', value: m.note })}<div class="row mt12">${btn('Сохранить', { size: 'sm', variant: 'secondary', action: 'toast', args: { msg: 'Заметка сохранена' } })}</div></section>
        <section class="cell span-4 danger-zone">${cellHead('Данные аккаунта', '')}<div class="stack" style="gap:10px">${btn('Выгрузить данные', { size: 'sm', variant: 'secondary', icon: 'download', action: 'toast', args: { msg: 'Готовим выгрузку, пришлём письмом' } })}<span class="t-meta">Всё, что платформа хранит об этом человеке, файлом. Клиентская книга сюда не входит.</span>${btn('Удалить аккаунт', { size: 'sm', variant: 'ghost-danger', icon: 'trash', action: 'dialog', args: { name: 'deleteAccount', id: m.id } })}<span class="t-meta">Обратной кнопки нет. ${m.type === 'solo' ? 'Кабинет мастера закрывается' : 'Салон закрывается'}, страница перестаёт отвечать.</span></div></section>
      </div>`;
    },
  };

  P.SCREENS['admin-organizations'] = {
    title: 'Салоны', hint: '61 · 14 с командой от трёх человек',
    render() {
      return `<section class="cell">${filters('Название или владелец', [[[['all', 'Команда: любая'], ['1', 'Одна'], ['2', '2–4'], ['5', 'от 5']], 'all'], [[['all', 'Состояние: все'], ['a', 'Работает'], ['s', 'Приостановлен'], ['ar', 'В архиве']], 'all']])}
      <div class="table-wrap"><table class="table responsive"><thead><tr><th>Салон</th><th>Владелец</th><th class="r">Команда</th><th class="r">Записи · 30 дней</th><th>Состояние</th><th>Тариф</th><th></th><th></th></tr></thead><tbody>${A.orgs.map((o) => `<tr class="click"${act('nav', { name: 'admin-master', id: 'm2' })}><td><div class="cellname">${avatar({ name: o.name, tone: 'm2' }, 'sm')}<div><b style="font-weight:500">${esc(o.name)}</b><small class="muted m-only" style="display:block">${esc(o.owner)} · ${P.countOf(o.team, ['человек', 'человека', 'человек'])} · ${P.num(o.bookings30)} за 30 дней</small></div></div></td><td class="hide-m">${esc(o.owner)}</td><td class="r num hide-m">${o.team}</td><td class="hide-m r num">${o.bookings30}</td><td class="hide-m">${status(o.status === 'active' ? 'ok' : o.status, { active: 'Работает', suspended: 'Приостановлен', archived: 'В архиве' }[o.status])}</td><td class="hide-m">${o.plan || '<span class="muted">Нет</span>'}</td><td class="r hide-m">${rowMenu('adminOrg', o.name)}</td><td class="m-right m-only">${status(o.status === 'active' ? 'ok' : o.status, { active: 'Работает', suspended: 'Приостановлен', archived: 'В архиве' }[o.status])}</td></tr>`).join('')}</tbody></table></div>${pager(1, A.orgs.length, 61)}</section>`;
    },
  };

  P.SCREENS['admin-users'] = {
    title: 'Пользователи', hint: 'Клиенты, мастера и администраторы платформы',
    render() {
      return `<section class="cell">${filters('Имя или почта', [[[['all', 'Роль: все'], ['c', 'Клиенты'], ['m', 'Мастера'], ['a', 'Админы']], 'all'], [[['any', 'Активность: любая'], ['b', 'Есть записи'], ['n', 'Ни одной записи']], 'any'], [[['all', 'Статус: все'], ['active', 'Активные'], ['blocked', 'Заблокированные']], 'all']])}
      <div class="table-wrap"><table class="table responsive"><thead><tr><th>Пользователь</th><th>Email / телефон</th><th>Роль</th><th>Последняя запись ↓</th><th>Регистрация</th><th></th></tr></thead><tbody>${[...A.users].sort((a, b) => (a.lastIso < b.lastIso ? 1 : -1)).map((u) => `<tr><td><div class="cellname">${avatar({ name: u.name, tone: { client: 'm3', master: 'm1', platform: 'm4' }[u.role] }, 'sm')}<div><b>${esc(u.name)}</b>${u.blocked ? ' ' + status('blocked') : ''}<small class="m-only">${esc(u.contact)} · ${{ client: 'клиент', master: 'мастер', platform: 'админ' }[u.role]}</small></div></div></td><td class="hide-m">${esc(u.contact)}</td><td class="hide-m">${{ client: 'Клиент', master: 'Мастер', platform: 'Администратор платформы' }[u.role]}</td><td class="hide-m num">${u.last}</td><td class="hide-m num">${u.signed}</td><td class="r hide-m">${u.self ? '<span class="t-meta">Это ваш аккаунт</span>' : rowMenu('adminUser', u.name)}</td></tr>`).join('')}</tbody></table></div>${pager(1, A.users.length, 4087)}</section>`;
    },
  };

  P.SCREENS['admin-requests'] = {
    title: 'Заявки', hint: '6 ждут ответа · одобрение заводит кабинет и отправляет письмо',
    actions: () => P.seg([['pending', 'Ждут ответа'], ['approved', 'Одобренные'], ['rejected', 'Отклонённые']], 'pending', 'noop'),
    render(st) {
      const cur = st.ui.req || 'r1';
      const r = A.requests.find((x) => x.id === cur);
      return `<div class="split ${st.ui.reqOpen ? 'detail' : ''}">
        <section class="cell flush" style="padding:8px">${A.requests.map((x) => `<button type="button" class="req ${x.id === cur ? 'on' : ''}"${act('req', { value: x.id, open: true })}><div class="row between"><b>${esc(x.name)}</b><span class="t-meta">${x.when}</span></div><small>${x.type === 'master' ? 'Мастер' : 'Салон'} · ${esc(x.city)} · ${x.lang}</small></button>`).join('')}</section>
        <section class="cell req-detail">
          ${btn('Все заявки', { size: 'sm', variant: 'ghost', icon: 'arrowL', cls: 'req-back', action: 'req', args: { value: cur, open: false } })}
          <div class="row between wrap"><div><div class="t-title">${esc(r.name)}</div><div class="t-meta mt8">Подана ${r.when} · ${r.type === 'master' ? 'мастер' : 'салон'} · ${esc(r.city)}</div></div><span class="chip">${r.lang}</span></div>
          <dl class="kv mt20"><dt>Кто подал</dt><dd>${esc(r.name)}</dd><dt>Почта</dt><dd>${esc(r.email)}</dd><dt>Телефон</dt><dd class="num">${r.phone || '<span class="muted">не указан</span>'}</dd><dt>Дело</dt><dd>${r.type === 'master' ? 'Мастер работает одна' : 'Салон с командой'}</dd><dt>Сообщение</dt><dd>${r.msg ? esc(r.msg) : '<span class="muted">О себе не написали</span>'}</dd></dl>
          <div class="cat-head mt20">Проверки</div>
          <div class="stack" style="gap:6px"><div class="row"><span class="status ${r.emailFree ? 'ok' : 'warn'}">${r.emailFree ? 'Аккаунта с этим адресом нет' : 'На этот адрес уже есть аккаунт — он станет мастерским после подтверждения'}</span></div><div class="row"><span class="status ${r.phone ? 'ok' : 'plain'}">${r.phone ? 'Телефон указан' : 'Телефон не указан'}</span></div></div>
          <div class="row mt28 wrap">${btn('Одобрить и завести кабинет', { variant: 'primary', icon: 'check', action: 'toast', args: { msg: `Кабинет создан: /${r.name.toLowerCase().replace(/[^a-zа-я]+/gi, '-')}` } })}${btn('Отклонить', { variant: 'ghost', action: 'sheet', args: { name: 'rejectRequest', id: r.id } })}</div>
          <div class="objection">При отказе спросим причину — она уйдёт человеку письмом.</div>
        </section>
      </div>`;
    },
  };

  P.SCREENS['admin-bookings'] = {
    title: 'Записи', hint: 'Все мастера и салоны · 1 264 в выбранном окне',
    actions: () => btn('Выгрузить CSV', { variant: 'ghost', icon: 'download', action: 'toast', args: { msg: 'Файл bookings.csv скачивается' } }),
    render() {
      const rows = [['12 сен 14:30', 'Lumen Studio', 'Салон', 'Элина Круминя', 'Маникюр с покрытием гель-лак', 'Страница записи', 'confirmed'], ['12 сен 14:00', 'Neve Nails', 'Мастер', 'Элина Круминя', 'Маникюр с покрытием', 'Страница записи', 'confirmed'], ['12 сен 12:00', 'Form Barbers', 'Салон', 'Эдгар Приедитис', 'Мужская стрижка', 'Кабинет мастера', 'completed'], ['12 сен 11:00', 'Studio Nara', 'Салон', 'Анете Лиепиня', 'Окрашивание', 'Страница записи', 'completed'], ['12 сен 10:00', 'Ilze Brows', 'Мастер', 'Санта Озолиня', 'Коррекция бровей', 'Страница записи', 'noshow'], ['12 сен 09:30', 'Cut Club', 'Салон', 'Янис Витолс', 'Мужская стрижка', 'Страница записи', 'completed'], ['12 сен 09:00', 'Ruta Brows', 'Мастер', 'Лиене Крауя', 'Ламинирование бровей', 'Страница записи', 'completed'], ['12 сен 08:30', 'Toms Barber', 'Мастер', 'Роберт Калнс', 'Стрижка бороды', 'Кабинет мастера', 'cancelled'], ['11 сен 19:00', 'Салон «Мята»', 'Салон', 'Марта Озола', 'Педикюр', 'Страница записи', 'completed'], ['11 сен 18:00', 'Zane Nails', 'Мастер', 'Дарья Соколова', 'Маникюр', 'Страница записи', 'completed'], ['11 сен 17:30', 'Lumen Studio', 'Салон', 'Инесе Заринья', 'Ламинирование ресниц', 'Кабинет мастера', 'completed'], ['11 сен 16:00', 'Studio Nara', 'Салон', 'Анна Крумина', 'Женская стрижка', 'Страница записи', 'noshow']];
      return `<section class="cell">${filters('Гость или салон', [[[['all', 'Кто ведёт: все'], ['s', 'Мастера'], ['o', 'Салоны']], 'all'], [[['today', 'Даты: сегодня'], ['w', 'Эта неделя'], ['m', 'Этот месяц'], ['all', 'Все']], 'today'], [[['all', 'Источник: любой'], ['p', 'Страница записи'], ['c', 'Кабинет мастера']], 'all']])}
      <div class="table-wrap"><table class="table responsive"><thead><tr><th>Начало ↓</th><th>Мастер / салон</th><th>Клиент</th><th>Услуга</th><th>Источник</th><th>Статус</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b style="font-weight:500" class="m-only">${r[3]}</b><span class="num hide-m"><b style="font-weight:500">${r[0]}</b></span><small class="m-only muted" style="display:block">${r[4]} · ${r[1]} · ${r[0]}</small></td><td class="hide-m">${r[1]} <span class="muted">· ${r[2]}</span></td><td class="hide-m">${r[3]}</td><td class="hide-m">${r[4]}</td><td class="hide-m">${r[5]}</td><td class="r">${status(r[6])}</td></tr>`).join('')}</tbody></table></div>${pager(1, rows.length, 1264)}</section>`;
    },
  };

  P.SCREENS['admin-subscriptions'] = {
    title: 'Подписки', hint: 'Только состояния тарифов. Суммы платежей живут у платёжного провайдера',
    actions: () => btn('Тарифы', { variant: 'secondary', icon: 'card', action: 'sheet', args: { name: 'plans' } }),
    render() {
      return `<section class="cell">${filters('Название салона', [[[['all', 'Тариф: любой'], ['solo', 'Соло'], ['salon', 'Салон']], 'all'], [[['any', 'Продление: любое'], ['soon', 'В ближайшие 30 дней'], ['past', 'Срок прошёл']], 'any']])}
      <div class="table-wrap"><table class="table responsive"><thead><tr><th>Салон</th><th>Тариф</th><th>Начата</th><th>Продление / конец ↑</th><th>Состояние</th><th></th></tr></thead><tbody>${[...A.subs].sort((a, b) => (a.renewsIso > b.renewsIso ? 1 : -1)).map((s) => `<tr><td><b style="font-weight:500">${esc(s.org)}</b><small class="muted m-only" style="display:block">${s.plan} · ${s.price} · ${s.status === 'cancelled' ? 'закончилась' : 'продлится'} ${s.renews}</small></td><td class="hide-m">${s.plan} <span class="muted">· ${s.price}</span></td><td class="hide-m num">${s.started}</td><td class="hide-m num">${s.status === 'cancelled' ? `Закончилась ${s.renews}` : `Продлится ${s.renews}`}</td><td>${status(s.status)}</td><td class="r">${rowMenu('adminSub', s.org)}</td></tr>`).join('')}</tbody></table></div>${pager(1, A.subs.length, 47)}</section>`;
    },
  };

  P.SCREENS['admin-announcements'] = {
    title: 'Объявления', hint: 'Полосы, которые видят мастера и салоны в кабинете',
    actions: () => btn('Новое объявление', { variant: 'primary', icon: 'plus', action: 'sheet', args: { name: 'announcement' } }),
    render() {
      return `<section class="cell">${filters('Заголовок объявления', [[[['all', 'Состояние: все'], ['live', 'Показывается'], ['sch', 'Запланировано'], ['end', 'Завершено']], 'all'], [[['all', 'Кому: всем'], ['m', 'Мастерам'], ['s', 'Салонам']], 'all']])}
      <div class="table-wrap"><table class="table responsive"><thead><tr><th>Заголовок</th><th>Кому</th><th>Показ</th><th>Автор</th><th>Состояние</th><th></th></tr></thead><tbody>${A.announcements.map((a) => `<tr><td><b style="font-weight:500">${esc(a.title)}</b><small class="muted m-only" style="display:block">${a.audience} · ${a.from}${a.to ? ` — ${a.to}` : ''} · прочитали ${P.num(a.read)}</small></td><td class="hide-m">${a.audience}</td><td class="hide-m num">${a.from}${a.to ? ` — ${a.to}` : ''}</td><td class="hide-m">${a.author}</td><td>${status(a.state)}</td><td class="r">${btn('', { size: 'sm', variant: 'ghost', icon: 'more', title: 'Действия с объявлением', action: 'menuAt', args: { name: 'announcementRow', state: a.state } })}</td></tr>`).join('')}</tbody></table></div></section>`;
    },
  };

  P.SCREENS['admin-health'] = {
    title: 'Состояние', hint: 'Требует внимания · 1 служба',
    actions: () => btn('Проверить снова', { variant: 'secondary', icon: 'refresh', action: 'toast', args: { msg: 'Проверки перезапущены' } }),
    render() {
      return `<section class="cell warn" style="background:var(--warn-soft);color:var(--warn);box-shadow:none;margin-bottom:12px"><div class="row"><b style="font-weight:500">Одна служба требует внимания</b><span class="spacer" style="flex:1"></span>${btn('К строке', { size: 'xs', variant: 'ghost' })}</div></section>
      <section class="cell"><div class="list">${A.health.map((h) => `<div class="health-row"><i class="${h.s === 'ok' ? '' : h.s}"></i><b style="font-weight:500">${esc(h.k)}</b><span class="detail">${esc(h.d)}</span><span class="lat num">${h.lat === '—' ? '' : h.lat}</span><span class="lat num">${h.t}</span></div>`).join('')}</div><p class="t-meta mt16">Отклик — время текущей проверки, а не среднее за сутки: истории проверок продукт не ведёт.</p></section>`;
    },
  };

  P.SCREENS['admin-logs'] = {
    title: 'Логи', hint: 'Новые сверху · хранится 90 дней',
    actions: () => `<span class="row"><span class="t-meta">Обновлять</span>${P.switch_(true, 'toast', { msg: 'Автообновление выключено' })}</span>`,
    render() {
      return `<section class="cell">${filters('Имя или действие', [[[['all', 'Важность: все'], ['i', 'Событие'], ['w', 'Внимание']], 'all'], [[['all', 'Кто: все'], ['p', 'Человек'], ['s', 'Поддержка'], ['sys', 'Система']], 'all']])}
      <div class="list">${A.logs.map((l) => `<div class="log-row ${l.sev}"><span class="ts">${l.ts}</span><span><span class="who">${esc(l.who)}</span> <span class="what">${esc(l.what)}</span><br><span class="obj">${esc(l.obj)}</span></span><span class="sev hide-m">${l.sev === 'warn' ? status('warn', 'Внимание') : ''}</span></div>`).join('')}</div><div class="pager"><span>${P.num(A.logs.length)} из ${P.num(12840)}</span>${btn('Показать ещё 50', { size: 'xs', variant: 'ghost' })}</div></section>`;
    },
  };

  P.SCREENS['admin-settings'] = {
    title: 'Настройки', hint: 'Разделы с подписью «сохраняется сразу» применяются в момент переключения',
    render() {
      return `<div class="grid c12">
        <div class="span-7 stack">
          <section class="cell">${cellHead('Общее', 'Сохраняется кнопкой внизу экрана')}<div class="form-grid">${P.field('Название сайта', P.input({ value: 'AMOLIE' }))}${P.field('Язык по умолчанию', P.select([['lv', 'Latviešu'], ['ru', 'Русский'], ['en', 'English']], 'lv'))}${P.field('Часовой пояс по умолчанию', P.select([['riga', 'Europe/Riga']], 'riga'))}${P.field('Валюта по умолчанию', P.select([['eur', 'EUR']], 'eur'))}${P.field('Окно записи, дней', P.input({ type: 'number', value: '60' }), 'На сколько дней вперёд клиент может записаться на публичной странице.')}${P.field('Макс. услуг на мастера', P.input({ type: 'number', value: '60' }))}${P.field('SEO-описание', P.textarea({ value: 'Онлайн-запись для мастеров индустрии красоты. Латвия и Балтия.' }), '', { cls: 'full' })}</div></section>
          <section class="cell">${cellHead('Письма', 'Сохраняется кнопкой внизу экрана')}<div class="form-grid">${P.field('Имя отправителя', P.input({ value: 'AMOLIE' }))}${P.field('Адрес для ответа', P.input({ value: 'support@amolie.com' }))}${P.field('Email поддержки', P.input({ value: 'support@amolie.com' }))}${P.field('Телефон поддержки', P.input({ value: '+371 20 000 000' }))}</div></section>
        </div>
        <div class="span-5 stack">
          <section class="cell">${cellHead('Регистрация', 'Сохраняется сразу')}<div class="radio-cards">${[['moderated', 'По заявкам', 'Каждая заявка ждёт вашего решения.'], ['open', 'Открытая', 'Кабинет создаётся сразу, очереди нет.']].map(([v, t, d], i) => `<button type="button" class="radio-card ${i === 0 ? 'on' : ''}"${act('toast', { msg: 'Сохранено' })}><i></i><div><b>${t}</b><span>${d}</span></div></button>`).join('')}</div></section>
          <section class="cell">${cellHead('Уведомления о заявках', 'Настройка своя у каждого устройства')}${P.switchRow('Уведомления о новых заявках', 'Включены на этом устройстве', true, 'toast', { msg: 'Выключены на этом устройстве' })}<dl class="kv mt12"><dt>Провайдер</dt><dd>Web Push (VAPID)</dd></dl></section>
          <section class="cell danger-zone">${cellHead('Опасная зона', 'Каждый спросит подтверждение')}${P.switchRow('Режим обслуживания', 'Всё, что меняет данные, отвечает «платформа на обслуживании». Чтение и страницы мастеров продолжают работать.', false, 'dialog', { name: 'maintenance' })}${P.switchRow('Остановить запись на всей платформе', 'Публичные страницы продолжат открываться, но кнопка записи ответит «временно недоступно».', false, 'dialog', { name: 'pauseBookings' })}</section>
        </div>
      </div>
      <div class="save-bar"><span class="t-meta">Изменения не сохранены</span>${btn('Сохранить', { variant: 'primary', action: 'toast', args: { msg: 'Сохранено' } })}</div>`;
    },
  };
})(window.P);

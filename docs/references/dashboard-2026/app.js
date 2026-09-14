/* Оболочка: роли, навигация, состояние, рендер, действия. */
(function (P) {
  const { icon, btn, esc, act, avatar } = P;

  P.ROLES = {
    solo: { label: 'Соло-мастер', org: 'Neve Nails', plan: 'Соло · Рига', home: 'home' },
    owner: { label: 'Владелица салона', org: 'Lumen Studio', plan: 'Салон · 5 человек', home: 'home' },
    admin: { label: 'Администратор салона', org: 'Lumen Studio', plan: 'Салон · 5 человек', home: 'home' },
    master: { label: 'Мастер в салоне', org: 'Lumen Studio', plan: 'Ногтевой сервис', home: 'home' },
    platform: { label: 'Администратор платформы', org: 'AMOLIE', plan: 'Панель платформы', home: 'admin-home' },
  };
  const caps = (role) => {
    const salon = role !== 'solo', team = salon;
    const owner = role === 'owner' || role === 'solo', admin = role === 'admin', master = role === 'master';
    return {
      hasTeam: team, canManageCalendar: role !== 'platform', canViewTeamCalendar: team && (owner || admin), canManageBookings: true, canManageClients: true,
      canViewServices: true, canManageServices: owner || admin, canManagePage: owner || admin, canManageWorkspace: owner, canManageTeam: salon && (owner || admin),
      canViewFinance: owner || admin, canManagePayouts: role === 'owner', canViewOwnPayouts: master, isPlatform: role === 'platform',
    };
  };

  const navFor = (st) => {
    const c = st.caps;
    if (c.isPlatform) return [
      { key: 'admin-home', label: 'Сводка', hint: 'Платформа за 30 дней', icon: 'grid', group: 'Платформа' }, { key: 'admin-masters', label: 'Мастера', hint: 'Все, кто ведёт запись', icon: 'user', group: 'Платформа' }, { key: 'admin-organizations', label: 'Салоны', hint: 'Заведения с командой', icon: 'building', group: 'Платформа' }, { key: 'admin-users', label: 'Пользователи', hint: 'Клиенты, мастера и админы', icon: 'clients', group: 'Платформа' },
      { key: 'admin-requests', label: 'Заявки', hint: 'Очередь на подключение', icon: 'inbox', group: 'Операции', badge: 6, badgeTone: 'amber' }, { key: 'admin-bookings', label: 'Записи', hint: 'Все визиты платформы', icon: 'bookings', group: 'Операции' }, { key: 'admin-subscriptions', label: 'Подписки', hint: 'Тарифы и продления', icon: 'card', group: 'Операции' }, { key: 'admin-announcements', label: 'Объявления', hint: 'Полосы в кабинетах', icon: 'megaphone', group: 'Операции' },
      { key: 'admin-health', label: 'Состояние', hint: 'Службы и очереди', icon: 'activity', group: 'Система' }, { key: 'admin-logs', label: 'Логи', hint: 'Кто и что делал', icon: 'file', group: 'Система' }, { key: 'admin-settings', label: 'Настройки', hint: 'Правила платформы', icon: 'settings', group: 'Система' },
    ];
    const pending = P.ctx(st).bookings.filter((b) => b.status === 'new').length;
    const items = [
      { key: 'home', label: 'Сегодня', hint: 'Что сегодня и как идут дела', icon: 'home' },
      { key: 'calendar', label: 'Календарь', hint: 'Окна, в которые к вам можно записаться', icon: 'calendar' },
      { key: 'bookings', label: 'Записи', hint: 'Все записи: новые, будущие и прошедшие', icon: 'bookings', badge: pending },
      c.canViewTeamCalendar && { key: 'front-desk', label: 'Ресепшен', hint: 'Кто сейчас в креслах, кого ждать', icon: 'clock' },
      { key: 'clients', label: 'Клиенты', hint: 'Ваша база: заметки и история визитов', icon: 'clients' },
      { key: 'services', label: 'Услуги', hint: 'Что вы делаете и сколько это стоит', icon: 'services' },
      c.canManagePage && { key: 'page', label: 'Страница', hint: 'То, что видят клиенты по вашей ссылке', icon: 'globe' },
      c.canManageTeam && { key: 'team', label: 'Команда', hint: 'Кто работает и что каждому доступно', icon: 'team' },
      c.canViewFinance && { key: 'finance', label: 'Финансы', hint: 'Сколько заработано', icon: 'finance' },
      c.canViewOwnPayouts && { key: 'payouts', label: 'Заработок', hint: 'Ваши утверждённые выплаты', icon: 'banknote' },
      { key: 'settings', label: 'Настройки', hint: 'Ваш вход и язык кабинета', icon: 'settings', group: 'Рабочее место' },
    ].filter(Boolean);
    return items;
  };

  P.tabKeys = (s) => (s.caps.isPlatform ? ['admin-home', 'admin-requests', 'admin-masters', 'admin-organizations'] : ['home', 'calendar', 'bookings']);
  const st = { role: 'owner', theme: 'light', device: 'desktop', route: { name: 'home' }, ui: {}, sheets: [], dialog: null, menu: null, toasts: [], palette: false };
  P.state = st;
  const sync = () => { st.caps = caps(st.role); st.nav = navFor(st); };
  sync();

  /* ---------- Рендер ---------- */
  const screenOf = () => {
    const s = P.SCREENS[st.route.name];
    if (!s) return P.SCREENS.nosection;
    const allowed = st.caps.isPlatform ? st.route.name.startsWith('admin-') : !st.route.name.startsWith('admin-') && (st.nav.some((n) => n.key === st.route.name) || ['client', 'member', 'start', 'studio', 'payouts'].includes(st.route.name));
    if (!allowed) return P.SCREENS.nosection;
    if (st.route.name === 'member' && !st.caps.canManageTeam) return P.SCREENS.nosection;
    if (st.route.name === 'payouts' && !(st.caps.canManagePayouts || st.caps.canViewOwnPayouts)) return P.SCREENS.nosection;
    if (st.route.name === 'studio' && !st.caps.canManagePage) return P.SCREENS.nosection;
    return s;
  };
  const val = (v) => (typeof v === 'function' ? v(st) : v);
  const activeKey = () => ({ client: 'clients', member: 'team', studio: 'page', start: 'home', payouts: st.caps.canViewOwnPayouts ? 'payouts' : 'finance', 'admin-master': 'admin-masters' }[st.route.name] || st.route.name);

  const rail = () => {
    const role = P.ROLES[st.role], me = P.ctx(st).me;
    let lastGroup = null;
    return `<nav class="rail" aria-label="Основная навигация">
      <div class="wordmark"><span class="mark">a</span><b>AMOLIE</b></div>
      <div class="org"><div class="name">${esc(role.org)}</div><div class="plan">${esc(role.plan)}</div></div>
      ${st.nav.map((it) => { const g = it.group && it.group !== lastGroup ? `<div class="group-label">${it.group}</div>` : ''; lastGroup = it.group || lastGroup; return `${g}<button type="button" class="nav-item ${activeKey() === it.key ? 'on' : ''}"${it.external ? act('toast', { msg: 'Открыли бы письмо в support@amolie.com' }) : act('nav', { name: it.key })}>${icon(it.icon)}<span>${it.label}</span>${it.badge ? `<span class="badge ${it.badgeTone || ''}">${it.badge}</span>` : ''}</button>`; }).join('')}
      <div class="rail-foot"><button type="button" class="me"${act('menuAt', { name: 'account' })}>${avatar(me)}<div><div class="who">${esc(me.name)}</div><div class="role">${esc(role.label)}</div></div></button></div>
    </nav>`;
  };

  const topbar = () => {
    const unread = P.activityOf(st).filter((a) => a.unread).length;
    return `<div class="topbar">
      <div class="search" role="button" tabindex="0"${act('palette')}>${icon('search')}<span>${st.caps.isPlatform ? 'Поиск по мастерам, салонам, пользователям и разделам…' : 'Поиск по клиентам, записям и действиям…'}</span><kbd>⌘K</kbd></div><span class="spacer"></span>
      <div class="clock"><b>${P.NOW.label}</b><small>сб, 12 сентября</small></div>
      ${st.caps.isPlatform ? '' : P.iconBtn('bell', 'menuAt', { args: { name: 'activity' }, title: 'Что нового', dot: unread > 0 })}
      ${P.iconBtn(st.theme === 'dark' ? 'sun' : 'moon', 'setTheme', { args: { value: st.theme === 'dark' ? 'light' : 'dark' }, title: 'Переключить тему' })}
      ${st.caps.isPlatform ? '' : btn('Создать', { variant: 'secondary', icon: 'plus', action: 'menuAt', args: { name: 'create' } })}
    </div>`;
  };

  const mobileTop = (screen) => {
    const back = val(screen.back);
    const title = screen.mobileTitle ? screen.mobileTitle(st) : val(screen.title);
    const unread = P.activityOf(st).filter((a) => a.unread).length;
    return `<div class="mobile-top">
      ${back ? P.iconBtn('arrowL', 'nav', { args: { name: back }, cls: 'ghost back', title: 'Назад' }) : ''}
      <div class="title">${title}</div>
      ${P.iconBtn('search', 'palette', { cls: 'ghost', title: 'Поиск' })}
      ${st.caps.isPlatform ? '' : P.iconBtn('bell', 'sheet', { args: { name: 'activity' }, cls: 'ghost', title: 'Что нового', dot: unread > 0 })}
      <button type="button" class="avatar sm ${P.ctx(st).me.tone}"${act('menuAt', { name: 'account' })} aria-label="Аккаунт">${P.initials(P.ctx(st).me.name)}</button>
    </div>`;
  };

  const tabbar = () => {
    const keys = P.tabKeys(st);
    const tabs = keys.map((k) => st.nav.find((n) => n.key === k)).filter(Boolean);
    const tab = (t) => `<button type="button" class="${activeKey() === t.key ? 'on' : ''}"${act('nav', { name: t.key })}>${icon(t.icon)}<span>${t.label}</span>${t.badge ? `<span class="badge ${t.badgeTone || ''}">${t.badge}</span>` : ''}</button>`;
    const more = `<button type="button" class="${!keys.includes(activeKey()) ? 'on' : ''}"${act('sheet', { name: 'more' })}>${icon('more')}<span>Ещё</span></button>`;
    if (st.caps.isPlatform) return `<nav class="tabbar" aria-label="Разделы">${tabs.map(tab).join('')}${more}</nav>`;
    return `<nav class="tabbar with-create" aria-label="Разделы">${tabs.slice(0, 2).map(tab).join('')}<button type="button" class="create"${act('sheet', { name: 'create' })} aria-label="Создать"><i>${icon('plus')}</i><span>Создать</span></button>${tabs.slice(2, 3).map(tab).join('')}${more}</nav>`;
  };

  const overlays = () => {
    let h = '';
    const bad = [];
    st.sheets.forEach((sh, i) => {
      const def = P.SHEETS[sh.name]; if (!def) return;
      const a = sh.args || {};
      try {
        const title = typeof def.title === 'function' ? def.title(st, a) : def.title;
        const hint = typeof def.hint === 'function' ? def.hint(st, a) : def.hint;
        const body = def.body(st, a);
        const foot = def.foot ? def.foot(st, a) : '';
        h += `<div class="overlay"${act('closeSheet')}></div><section class="sheet ${def.size || ''}" role="dialog" aria-modal="true" aria-label="${esc(title.replace(/<[^>]+>/g, ''))}" style="z-index:${31 + i}">
        <div class="handle"></div>
        <div class="sheet-head"><div class="titles"><h2>${title}</h2>${hint ? `<div class="t-hint">${hint}</div>` : ''}</div>${def.more ? P.iconBtn('more', 'menuAt', { args: def.more(st, a), cls: 'ghost sm', title: 'Ещё' }) : ''}${P.iconBtn('x', 'closeSheet', { cls: 'ghost sm', title: 'Закрыть' })}</div>
        <div class="sheet-body">${body}</div>
        ${foot ? `<div class="sheet-foot">${foot}</div>` : '<div></div>'}
      </section>`;
      } catch (err) { console.error('sheet', sh.name, err); bad.push(sh); }
    });
    if (bad.length) st.sheets = st.sheets.filter((x) => !bad.includes(x));
    if (st.dialog) {
      const d = P.DIALOGS[st.dialog.name];
      h += `<div class="overlay" style="z-index:${40}"${act('closeDialog')}></div><div class="dialog" role="alertdialog" style="z-index:41"><h2>${typeof d.title === 'function' ? d.title(st, st.dialog.args) : d.title}</h2><p>${typeof d.text === 'function' ? d.text(st, st.dialog.args) : d.text}</p><div class="acts">${btn('Отмена', { variant: 'ghost', action: 'closeDialog' })}${btn(d.confirm, { variant: d.danger ? 'danger' : 'primary', action: 'confirmDialog' })}</div></div>`;
    }
    if (st.menu) {
      const items = P.MENUS[st.menu.name](st, st.menu.args);
      const list = items.map((it) => it.head ? `<div class="menu-head">${it.head}</div>` : it.hr ? '<hr>' : `<button type="button" class="${it.danger ? 'danger' : ''}"${act(it.action, { ...(it.args || {}), closeMenu: true })}>${it.icon ? icon(it.icon) : ''}<span>${it.label}</span></button>`).join('');
      const headItem = items.find((it) => it.head);
      if (st.narrow) h += `<div class="overlay" style="z-index:42"${act('closeMenu')}></div><div class="dialog sheet-like" style="z-index:43"><div class="handle"></div><div class="sheet-head"><div class="titles"><h2>${headItem ? headItem.head : 'Действия'}</h2></div>${P.iconBtn('x', 'closeMenu', { cls: 'ghost sm', title: 'Закрыть' })}</div><div class="menu" style="position:static;box-shadow:none;border:0;animation:none">${items.filter((it) => !it.head).map((it) => it.hr ? '<hr>' : `<button type="button" class="${it.danger ? 'danger' : ''}"${act(it.action, { ...(it.args || {}), closeMenu: true })}>${it.icon ? icon(it.icon) : ''}<span>${it.label}</span></button>`).join('')}</div></div>`;
      else h += `<div class="overlay" style="background:transparent;z-index:42"${act('closeMenu')}></div><div class="menu" style="z-index:43;left:${st.menu.x}px;top:${st.menu.y}px;${st.menu.right ? `left:auto;right:${st.menu.right}px;` : ''}">${list}</div>`;
    }
    if (st.palette) {
      h += `<div class="overlay" style="z-index:44"${act('closePalette')}></div><div class="palette" style="z-index:45" role="dialog" aria-label="Быстрый поиск">
        <div class="in">${icon('search')}<input id="palette-input" placeholder="${st.caps.isPlatform ? 'Мастер, салон, раздел' : 'Имя, телефон, действие'}" autocomplete="off" value="${esc(st.ui.q || '')}">${btn('Отмена', { variant: 'ghost', size: 'sm', cls: 'palette-cancel', action: 'closePalette' })}</div>
        <div class="res" id="palette-res">${paletteResults()}</div>
        <div class="foot"><span><kbd>↑↓</kbd>выбрать</span><span><kbd>↵</kbd>открыть</span><span><kbd>esc</kbd>закрыть</span></div>
      </div>`;
    }
    h += `<div class="toasts">${st.toasts.map((t) => `<div class="toast"><span>${esc(t.msg)}</span>${t.undo ? `<button type="button"${act('undoToast', { id: t.id })}>Вернуть</button>` : ''}</div>`).join('')}</div>`;
    return h;
  };

  const paletteResults = () => {
    const q = (st.ui.q || '').trim().toLowerCase();
    const hit = (...xs) => !q || xs.some((x) => String(x || '').toLowerCase().includes(q));
    const groups = [];
    if (st.caps.isPlatform) {
      const A = P.ADMIN;
      groups.push(['Мастера и салоны', A.masters.filter((m) => hit(m.name, m.org, m.email)).slice(0, 4).map((m) => ({ icon: null, av: { name: m.name, tone: m.type === 'solo' ? 'm1' : 'm2' }, label: m.name, meta: `${m.org} · ${m.type === 'solo' ? 'мастер' : 'салон'}`, k: 'карточка', action: 'nav', args: { name: 'admin-master', id: m.id } }))]);
      groups.push(['Пользователи', A.users.filter((u) => hit(u.name, u.contact)).slice(0, 3).map((u) => ({ av: { name: u.name, tone: 'm3' }, label: u.name, meta: u.contact, k: 'открыть', action: 'nav', args: { name: 'admin-users' } }))]);
      groups.push(['Заявки', A.requests.filter((r) => hit(r.name, r.email, r.city)).slice(0, 3).map((r) => ({ icon: 'inbox', label: r.name, meta: `${r.city} · ${r.when}`, k: 'разобрать', action: 'nav', args: { name: 'admin-requests' } }))]);
      groups.push(['Разделы', st.nav.filter((n) => hit(n.label)).slice(0, 6).map((n) => ({ icon: n.icon, label: n.label, k: 'перейти', action: 'nav', args: { name: n.key } }))]);
    } else {
      groups.push(['Клиенты', P.CLIENTS.filter((c) => !c.dup && hit(c.name, c.phone)).slice(0, 4).map((c) => ({ av: c, label: c.name, meta: `${c.phone} · визитов: ${c.visits}`, k: 'открыть', action: 'nav', args: { name: 'client', id: c.id } }))]);
      groups.push(['Действия', P.createItems(st).filter((it) => hit(it.label, it.hint)).map((it) => ({ icon: it.icon, label: it.label, meta: it.hint, k: 'выполнить', action: it.action, args: it.args }))]);
      groups.push(['Разделы', st.nav.filter((n) => !n.external && hit(n.label, n.hint)).slice(0, 6).map((n) => ({ icon: n.icon, label: n.label, k: 'перейти', action: 'nav', args: { name: n.key } }))]);
    }
    const rows = groups.filter(([, xs]) => xs.length);
    if (!rows.length) return `<div class="empty"><b>Ничего не нашлось</b><p>Попробуйте имя, телефон или название раздела.</p></div>`;
    let first = true;
    return rows.map(([g, xs]) => `<div class="grp">${g}</div>${xs.map((x) => { const on = first ? 'on' : ''; first = false; return `<button type="button" class="it ${on}"${act(x.action, { ...x.args, closePalette: true })}>${x.av ? avatar(x.av, 'sm') : icon(x.icon || 'search')}<span>${esc(x.label)}</span>${x.meta ? `<span class="t-meta num">${esc(x.meta)}</span>` : ''}<span class="k">${x.k}</span></button>`; }).join('')}`).join('');
  };
  P.render = () => {
    sync();
    const app = document.getElementById('app');
    app.dataset.theme = st.theme;
    st.narrow = app.clientWidth <= 760;
    const screen = screenOf();
    const isFull = screen.full;
    const head = isFull ? '' : `<div class="page-head">${val(screen.crumb) ? `<div style="flex-basis:100%"><div class="crumbs"><a href="#"${act('nav', { name: val(screen.back) })}>${val(screen.crumb)}</a><span>/</span><span>${val(screen.title)}</span></div></div>` : ''}<div><h1>${val(screen.title)}</h1>${val(screen.hint) ? `<div class="sub">${val(screen.hint)}</div>` : ''}</div><div class="actions">${screen.actions ? screen.actions(st) : ''}</div></div>`;
    app.innerHTML = `
      <div class="statusbar"><span>${P.NOW.label}</span><span class="bat">5G <i></i></span></div><div class="home-ind"></div>
      ${rail()}
      <div class="main">
        ${isFull ? '' : topbar()}
        ${isFull ? '' : mobileTop(screen)}
        ${isFull || !screen.actions ? '' : `<div class="mobile-actions">${screen.actions(st)}</div>`}
        ${isFull ? screen.render(st) : `<div class="page ${st.enter ? 'enter' : ''}" id="page">${head}${screen.render(st)}</div>`}
      </div>
      ${isFull ? '' : tabbar()}
      ${overlays()}`;
    if (st.palette) { const i = document.getElementById('palette-input'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); i.addEventListener('input', () => { st.ui.q = i.value; const r = document.getElementById('palette-res'); if (r) r.innerHTML = paletteResults(); }); } }
    const onChip = document.querySelector('#app .chips.scroll .chip.on');
    if (onChip && onChip.scrollIntoView) onChip.scrollIntoView({ block: 'nearest', inline: 'center' });
    if (st.focusLive) { const el = document.querySelector(`[data-live="${st.focusLive}"]`); if (el) { el.focus(); const v = el.value.length; el.setSelectionRange(v, v); } st.focusLive = null; }
    const sc = document.getElementById('page'); if (sc && st.scrollTop != null) { sc.scrollTop = st.scrollTop; st.scrollTop = null; }
    st.enter = false;
    const onStep = document.querySelector('#app .onb-step.on'); if (onStep && onStep.scrollIntoView) onStep.scrollIntoView({ block: 'nearest', inline: 'center' });
    P.syncBar();
  };

  /* ---------- Действия ---------- */
  const keepScroll = () => { const sc = document.getElementById('page'); st.scrollTop = sc ? sc.scrollTop : 0; };
  let toastId = 0;
  const toast = (msg, undo) => { const id = ++toastId; st.toasts.push({ id, msg, undo }); P.render(); setTimeout(() => { if (!st.toasts.some((t) => t.id === id)) return; st.toasts = st.toasts.filter((t) => t.id !== id); keepScroll(); P.render(); }, 3600); };
  P.toast = toast;
  const closeAll = () => { st.sheets = []; st.dialog = null; st.menu = null; st.palette = false; };
  const ACTIONS = {
    nav(a) { if (a.close) st.sheets = []; if (a.closePalette) { st.palette = false; st.ui.q = ''; } st.menu = null; st.enter = a.name !== st.route.name; st.route = { name: a.name, id: a.id }; if (a.view) st.ui.calView = a.view; if (a.member) st.ui.calMember = a.member; if (a.filter) st.ui.bkFilter = a.filter; st.scrollTop = 0; },
    sheet(a) { if (a.closePalette) { st.palette = false; st.ui.q = ''; } st.menu = null; if (a.replace && st.sheets.length) st.sheets.pop(); if (st.sheets.length && st.sheets[st.sheets.length - 1].name === a.name) st.sheets.pop(); if (a.name === 'create' && !st.narrow) { st.menu = { name: 'create', x: 0, y: 66, right: 32 }; return; } st.sheets.push({ name: a.name, args: { ...a } }); },
    closeSheet() { st.sheets.pop(); st.ui.nbServices = null; st.ui.nbWhen = null; },
    sheetArg(a) { const top = st.sheets[st.sheets.length - 1]; if (top) { top.args[a.key] = a.value; if (a.key === 'clientId' && a.value) top.args.error = null; } },
    dialog(a) { st.menu = null; st.dialog = { name: a.name, args: a }; },
    closeDialog() { st.dialog = null; },
    confirmDialog() { const d = P.DIALOGS[st.dialog.name]; const isLogout = st.dialog.name === 'logout'; st.dialog = null; if (['cancelBooking', 'declineBooking', 'deleteSlot', 'deleteService', 'deleteCategory', 'deleteClient', 'studioRevert', 'blockClient', 'deleteDraft'].includes(Object.keys(P.DIALOGS).find((k) => P.DIALOGS[k] === d))) st.sheets = []; if (isLogout) { st.sheets = []; } toast(d.msg, d.undo); },
    menuAt(a, el, ev) { if (st.menu && st.menu.name === a.name) { st.menu = null; return; } const app = document.getElementById('app').getBoundingClientRect(); const r = el.getBoundingClientRect(); const menuW = 260; let x = r.left - app.left, y = r.bottom - app.top + 6; if (a.name === 'emptySlot' && ev) { x = ev.clientX - app.left; y = ev.clientY - app.top + 4; } if (x + menuW > app.width - 12) x = app.width - menuW - 12; if (y + 280 > app.height) y = Math.max(12, app.height - 292); st.menu = { name: a.name, args: a, x, y }; if (a.name === 'account' && !st.narrow) { st.menu.y = r.top - app.top - 230; } if (a.name === 'pick') { st.menu.x = r.left - app.left; if (st.menu.x + menuW > app.width - 12) st.menu.x = app.width - menuW - 12; } },
    closeMenu() { st.menu = null; },
    palette() { st.palette = true; },
    closePalette() { st.palette = false; st.ui.q = ''; },
    toast(a) { if (a.closeMenu) st.menu = null; toast(a.msg, a.undo); },
    undoToast(a) { st.toasts = st.toasts.filter((t) => t.id !== a.id); toast('Возвращено'); },
    submit(a, el) {
      const top = st.sheets[st.sheets.length - 1];
      if (top && a.requireArg && !top.args[a.requireArg]) { top.args.error = a.error; return; }
      if (top && a.requireInput) { const sheetEl = el.closest('.sheet'); const inp = sheetEl && sheetEl.querySelector(a.requireInput); if (inp && !inp.value.trim()) { top.args.error = a.error; return; } }
      st.sheets.pop(); st.ui.nbServices = null; st.ui.nbWhen = null; toast(a.msg, a.undo);
    },
    pickSet(a) { st.menu = null; st.ui.picks = st.ui.picks || {}; st.ui.picks[a.key] = a.value; },
    setUi(a) { st.ui[a.key] = a.value; },
    toggleUi(a) { st.ui[a.key] = !st.ui[a.key]; },
    studioCtx(a) { st.ui.studioCtx = a.value; st.ui.studioSec = a.value === 'page' ? 'style' : a.value === 'booking' ? 'bk-order' : 'st-live'; },
    studioPanel() { st.ui.studioPanel = !st.ui.studioPanel; },
    bkFilter(a) { st.ui.bkFilter = a.value; },
    obWorld(a) { st.ui.obWorld = a.value; },
    confirmBooking(a) { const b = P.bookingOf(st, a.id); b.status = 'confirmed'; if (a.close) st.sheets = []; st.menu = null; toast('Запись подтверждена — клиент увидит это сразу'); },
    completeBooking(a) { const b = P.bookingOf(st, a.id); b.status = 'completed'; if (a.close) st.sheets = []; st.menu = null; toast('Визит отмечен завершённым', true); },
    noShow(a) { const b = P.bookingOf(st, a.id); b.status = 'noshow'; if (a.close) st.sheets = []; st.menu = null; toast('Отмечено: клиент не пришёл', true); },
    openBooking(a) { st.menu = null; st.sheets.push({ name: 'bookingDetail', args: { id: a.id } }); },
    setTheme(a) { st.menu = null; st.theme = a.value === 'system' ? 'light' : a.value; },
    setTab(a) { st.ui.setTab = a.value; st.scrollTop = 0; },
    calView(a) { st.ui.calView = a.value; }, calMember(a) { st.ui.calMember = a.value; }, svcTab(a) { st.ui.svcTab = a.value; }, pageTab(a) { st.ui.pageTab = a.value; }, period(a) { st.ui.period = a.value; }, req(a) { st.ui.req = a.value; if (a.open != null) st.ui.reqOpen = a.open; st.scrollTop = 0; },
    step(a, el) {
      if (a.require && !a.skip) { const inp = document.getElementById('ob-' + a.require); if (inp && !inp.value.trim()) { st.ui.obError = a.require; return; } }
      st.ui.obError = null; st.ui.step = a.value; st.scrollTop = 0;
    },
    studioSec(a) { st.ui.studioSec = st.ui.studioSec === a.value ? null : a.value; }, studioDev(a) { st.ui.studioDev = a.value; }, studioWorld(a) { st.ui.studioWorld = a.value; },
    nbWhen(a) { st.ui.nbWhen = a.value; }, nbToggle(a) { const cur = st.ui.nbServices || ['s-mani-gel']; st.ui.nbServices = cur.includes(a.id) ? cur.filter((x) => x !== a.id) : [...cur, a.id]; },
    toggle(a, el) { el.classList.toggle('on'); el.setAttribute('aria-checked', el.classList.contains('on')); const bar = document.querySelector('#app .save-bar'); if (bar && el.closest('#page')) bar.classList.add('on'); return false; },
    noop() { return false; },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || !document.getElementById('app').contains(el)) return;
    e.preventDefault();
    const a = el.dataset.args ? JSON.parse(el.dataset.args) : {};
    if (el.classList.contains('switch') && el.dataset.action !== 'toggle') { el.classList.toggle('on'); }
    const fn = ACTIONS[el.dataset.action];
    if (!fn) return;
    if (!['nav', 'step'].includes(el.dataset.action)) keepScroll();
    const r = fn(a, el, e);
    if (a.closeMenu) st.menu = null;
    if (r !== false) P.render();
  });
  let liveTimer = null;
  document.addEventListener('input', (e) => {
    const el = e.target.closest && e.target.closest('[data-live]');
    if (!el) return;
    const key = el.dataset.live;
    st.ui[key] = el.value;
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => { keepScroll(); st.focusLive = key; P.render(); }, 180);
  });
  document.addEventListener('input', (e) => { if (e.target.closest && e.target.closest('#page') && !e.target.dataset.live) { const bar = document.querySelector('#app .save-bar'); if (bar) bar.classList.add('on'); } });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (st.palette) { st.palette = false; st.ui.q = ''; } else if (st.menu) st.menu = null; else if (st.dialog) st.dialog = null; else if (st.sheets.length) st.sheets.pop(); else return; keepScroll(); P.render(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); st.palette = !st.palette; keepScroll(); P.render(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.closest && e.target.closest('[role="button"][data-action]')) e.target.click(); });

  /* ---------- Панель прототипа ---------- */
  P.syncBar = () => {
    const roleSel = document.getElementById('role'); if (roleSel) roleSel.value = st.role;
    document.querySelectorAll('[data-theme-btn]').forEach((b) => b.classList.toggle('on', b.dataset.themeBtn === st.theme));
    document.querySelectorAll('[data-device-btn]').forEach((b) => b.classList.toggle('on', b.dataset.deviceBtn === st.device));
    document.querySelector('.stage').dataset.device = st.device;
    const list = document.getElementById('screen');
    if (list) {
      const screens = st.caps.isPlatform ? st.nav.map((n) => [n.key, n.label]) : [...st.nav.filter((n) => !n.external).map((n) => [n.key, n.label]), ['client', 'Карточка клиента'], st.caps.canManageTeam && ['member', 'Карточка мастера'], st.caps.canManagePayouts && ['payouts', 'Выплаты'], st.caps.canManagePage && ['studio', 'Студия'], ['start', 'Онбординг']].filter(Boolean);
      const sheets = st.caps.isPlatform ? [['rejectRequest', 'Отклонить заявку'], ['assignPlan', 'Тариф'], ['plans', 'Тарифы'], ['announcement', 'Объявление']] : [['newBooking', 'Новая запись'], ['bookingDetail', 'Карточка записи'], ['editBooking', 'Изменить запись'], ['reschedule', 'Перенести'], ['clientForm', 'Клиент'], ['publishSlot', 'Открыть время'], ['publishPeriod', 'Опубликовать период'], ['clearPeriod', 'Окна за период'], ['blockTime', 'Заблокировать время'], ['blockDetail', 'Блок'], ['slotDetail', 'Свободное окно'], st.caps.canManageServices && ['serviceForm', 'Услуга'], st.caps.canManageServices && ['categoryForm', 'Категория'], st.caps.canManageTeam && ['invite', 'Приглашение'], st.caps.canManagePayouts && ['compensation', 'Условия расчёта'], ['activity', 'Что нового'], ['create', 'Создать']].filter(Boolean);
      list.innerHTML = `<option value="">Перейти к экрану…</option><optgroup label="Экраны">${screens.map(([k, l]) => `<option value="s:${k}">${l}</option>`).join('')}</optgroup><optgroup label="Шторки и окна">${sheets.map(([k, l]) => `<option value="sh:${k}">${l}</option>`).join('')}<option value="d:logout">Диалог: выйти</option><option value="p:">Поиск ⌘K</option></optgroup>`;
      list.value = '';
    }
  };
  document.getElementById('role').addEventListener('change', (e) => { st.role = e.target.value; st.ui = {}; closeAll(); sync(); st.enter = true; st.route = { name: P.ROLES[st.role].home }; P.render(); });
  document.querySelectorAll('[data-theme-btn]').forEach((b) => b.addEventListener('click', () => { st.theme = b.dataset.themeBtn; P.render(); }));
  document.querySelectorAll('[data-device-btn]').forEach((b) => b.addEventListener('click', () => { st.device = b.dataset.deviceBtn; st.menu = null; P.render(); }));
  document.getElementById('screen').addEventListener('change', (e) => {
    const [kind, key] = e.target.value.split(':'); if (!kind) return;
    closeAll(); st.scrollTop = 0;
    if (kind === 's') { st.enter = true; st.route = { name: key, id: key === 'client' ? 'k1' : key === 'member' ? 'anna' : key === 'admin-master' ? 'm2' : undefined }; }
    if (kind === 'sh') { if (!st.caps.isPlatform && st.route.name.startsWith('admin-')) st.route = { name: 'home' }; st.sheets = [{ name: key, args: { org: key === 'assignPlan' ? 'Lumen Studio' : undefined, id: key === 'bookingDetail' || key === 'editBooking' || key === 'reschedule' ? (st.role === 'solo' ? 'n3' : 'b6') : key === 'clientForm' ? 'k1' : key === 'serviceForm' ? 's-mani-gel' : key === 'categoryForm' ? 'c-nails' : key === 'compensation' ? 'anna' : key === 'blockDetail' ? (st.role === 'solo' ? 'nx1' : 'x1') : key === 'slotDetail' ? (st.role === 'solo' ? 'nf1' : 'f1') : undefined } }]; }
    if (kind === 'd') st.dialog = { name: key, args: {} };
    if (kind === 'p') st.palette = true;
    P.render();
  });
  window.addEventListener('resize', () => { const app = document.getElementById('app'); const n = app.clientWidth <= 760; if (n !== st.narrow) { st.menu = null; P.render(); } });
  P.render();
})(window.P);

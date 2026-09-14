/* Примитивы интерфейса: иконки, кнопки, ячейки, статусы, поля, линейка суток. */
(function (P) {
  const ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    clients: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5c3 0 5.5 2 5.5 5"/>',
    services: '<path d="M4 7h16M4 12h10M4 17h13"/><circle cx="19" cy="17" r="2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.3 3 14.7 0 18M12 3c-3 3.3-3 14.7 0 18"/>',
    team: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2.5 20c0-3 2.5-5.5 5.5-5.5S13.5 17 13.5 20M10.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5"/>',
    finance: '<path d="M4 19V9M10 19V5M16 19v-8M22 19H2"/>',
    banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    chevL: '<path d="m15 6-6 6 6 6"/>',
    chevR: '<path d="m9 6 6 6-6 6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    msg: '<path d="M4 5h16v11H9l-5 4z"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 13v7H4V6h7"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5h10"/>',
    edit: '<path d="M4 20h4l11-11-4-4L4 16z"/><path d="m13 7 4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3"/>',
    inbox: '<path d="M4 4h16v16H4z"/><path d="M4 14h5l1.5 2h3L15 14h5"/>',
    bookings: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    megaphone: '<path d="M3 10v4h3l7 4V6l-7 4H3z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    block: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    qr: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2"/>',
    share: '<path d="M12 3v12M8 7l4-4 4 4M5 13v7h14v-7"/>',
    arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10 6.3A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3 3.5M6.6 6.6C3.7 8.5 2 12 2 12s3.5 6 10 6a9.7 9.7 0 0 0 3.4-.6"/>',
    undo: '<path d="M8 8H3V3M3.5 8A9 9 0 1 1 3 13"/>',
    redo: '<path d="M16 8h5V3M20.5 8A9 9 0 1 0 21 13"/>',
    history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2M3 12h2"/>',
    phoneDev: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17l-5.4 2.8 1.1-6.1L3.2 9.4l6.1-.8z"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/>',
    lang: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    filter: '<path d="M4 6h16l-6 7v5l-4 2v-7z"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
    key: '<circle cx="8" cy="14" r="4"/><path d="M11 11l9-9M16 6l2 2M13 9l2 2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 3-2a9 9 0 0 0-5-11z"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7" r="1.2"/><circle cx="16" cy="10" r="1.2"/>',
    wand: '<path d="m4 20 10-10M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 12l.7 1.3L21 14l-1.3.7L19 16l-.7-1.3L17 14l1.3-.7z"/>',
    drag: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
    move: '<path d="M4 12h16M12 4v16M9 7l3-3 3 3M9 17l3 3 3-3M7 9l-3 3 3 3M17 9l3 3-3 3"/>',
  };
  P.icon = (name, cls) => `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  P.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  P.args = (o) => (o ? ` data-args='${P.esc(JSON.stringify(o))}'` : '');
  P.act = (action, o) => ` data-action="${action}"${P.args(o)}`;

  P.fmtTime = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  P.fmtDur = (m) => (m >= 60 ? `${Math.floor(m / 60)}\u00A0ч${m % 60 ? `\u00A0${m % 60}\u00A0мин` : ''}` : `${m}\u00A0мин`);
  P.fmtDurShort = (m) => (m >= 60 ? `${Math.floor(m / 60)}\u00A0ч${m % 60 ? `\u00A0${m % 60}` : ''}` : `${m}\u00A0мин`);
  P.eur = (n) => `${Number(n).toLocaleString('ru-RU').replace(/\s/g, '\u00A0')}\u00A0€`;
  P.plur = (n, forms) => { const a = Math.abs(n) % 100, b = a % 10; return forms[a > 10 && a < 20 ? 2 : b > 1 && b < 5 ? 1 : b === 1 ? 0 : 2]; };
  P.countOf = (n, forms) => `${P.num(n)}\u00A0${P.plur(n, forms)}`;
  P.num = (n) => String(Number(n).toLocaleString('ru-RU')).replace(/\s/g, '\u00A0');
  P.initials = (name) => name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  P.btn = (label, o = {}) => {
    const cls = ['btn', o.variant || 'secondary', o.size || '', o.block ? 'block' : '', o.icon && !label ? 'icon' : '', o.cls || ''].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}"${o.action ? P.act(o.action, o.args) : ''}${o.disabled ? ' disabled' : ''}${o.title ? ` aria-label="${P.esc(o.title)}"` : ''}>${o.icon ? P.icon(o.icon) : ''}${label ? `<span>${label}</span>` : ''}</button>`;
  };
  P.iconBtn = (icon, action, o = {}) => `<button type="button" class="iconbtn ${o.cls || ''}"${P.act(action, o.args)} aria-label="${P.esc(o.title || icon)}">${P.icon(icon)}${o.dot ? '<i class="dot"></i>' : ''}</button>`;

  P.cellHead = (title, hint, link) => `<div class="cell-head"><div class="titles"><h2 class="t-section">${title}</h2>${hint ? `<div class="t-meta mt-2">${hint}</div>` : ''}</div>${link ? `<a class="link"${link.action ? P.act(link.action, link.args) : ''} href="#">${link.label}</a>` : ''}</div>`;

  const STATUS = { new: 'Ждёт ответа', confirmed: 'Подтверждена', completed: 'Завершена', cancelled: 'Отменена', noshow: 'Не пришёл', expired: 'Без ответа', draft: 'Черновик', approved: 'Утверждена', paid: 'Выплачена', active: 'Активна', frozen: 'Заморожена', ok: 'Работает', warn: 'С оговоркой', down: 'Не работает', suspended: 'Приостановлен', archived: 'В архиве', blocked: 'Заблокирован', live: 'Показывается', scheduled: 'Запланировано', ended: 'Завершено', none: 'Без подписки' };
  const STATUS_CLS = { new: 'wait', frozen: 'warn', active: 'ok', suspended: 'warn', archived: 'plain', blocked: 'danger', live: 'ok', scheduled: 'warn', ended: 'plain', none: 'plain', cancelled: 'plain', paid: 'done', approved: 'ok', completed: 'done', lilac: 'fav' };
  P.status = (s, label) => `<span class="status ${STATUS_CLS[s] || s}">${label || STATUS[s] || s}</span>`;

  P.avatar = (who, size) => {
    const tone = who.tone || 'm3';
    return `<span class="avatar ${size || ''} ${tone}" aria-hidden="true">${P.initials(who.name)}</span>`;
  };
  P.switch_ = (on, action, args) => `<button type="button" class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}"${P.act(action || 'toggle', args)}><i></i></button>`;
  P.switchRow = (title, hint, on, action, args) => `<div class="switch-row"><div class="txt"><b>${title}</b>${hint ? `<span>${hint}</span>` : ''}</div>${P.switch_(on, action, args)}</div>`;

  P.field = (label, control, help, o = {}) => `<div class="field ${o.cls || ''} ${o.error ? 'err' : ''}"><label>${label}</label>${control}${help ? `<div class="help">${help}</div>` : ''}${o.error ? `<div class="error">${o.error}</div>` : ''}</div>`;
  P.liveInput = (key, o = {}) => { const st = P.state || { ui: {} }; return `<input class="input ${o.cls || ''}" type="text" value="${P.esc(st.ui[key] || '')}" placeholder="${P.esc(o.placeholder || '')}" data-live="${key}" autocomplete="off">`; };
  P.input = (o = {}) => `<input class="input ${o.cls || ''}" type="${o.type || 'text'}" value="${P.esc(o.value || '')}" placeholder="${P.esc(o.placeholder || '')}"${o.attrs || ''}>`;
  /* Поле выбора даты/времени: своё, не системное. Значение живёт в st.ui.picks[key]. */
  P.pickField = (kind, key, def, o = {}) => { const st = P.state || { ui: {} }; const v = (st.ui.picks || {})[key] || def; return `<button type="button" class="input pick ${o.cls || ''}"${P.act('menuAt', { name: 'pick', kind, key })} aria-haspopup="menu">${P.icon(kind === 'date' ? 'calendar' : 'clock', 'lead')}<span>${P.esc(v)}</span>${P.icon('chevD', 'trail')}</button>`; };
  P.select = (options, value, o = {}) => `<select class="select ${o.cls || ''}"${o.attrs || ''}>${options.map((x) => { const [v, l] = Array.isArray(x) ? x : [x, x]; return `<option value="${P.esc(v)}"${v === value ? ' selected' : ''}>${P.esc(l)}</option>`; }).join('')}</select>`;
  P.textarea = (o = {}) => `<textarea class="textarea" placeholder="${P.esc(o.placeholder || '')}" rows="${o.rows || 3}">${P.esc(o.value || '')}</textarea>`;
  P.upload = (hint) => `<div class="upload">${P.icon('upload')}<div class="txt"><b>Перетащите файл или выберите</b><span>${hint || 'JPG, PNG или WebP'}</span></div>${P.btn('Выбрать', { size: 'xs', variant: 'secondary' })}</div>`;
  P.seg = (items, value, action, extra) => `<div class="seg ${extra || ''}">${items.map(([v, l]) => `<button type="button" class="${v === value ? 'on' : ''}"${P.act(action, { value: v })}>${l}</button>`).join('')}</div>`;

  P.empty = (title, text, btn, ring) => `<div class="empty ${ring ? 'ring' : ''}"><b>${title}</b><p>${text}</p>${btn || ''}</div>`;

  /* Линейка суток: 08:00–21:00 */
  P.dayRail = (segs, o = {}) => {
    const from = o.from || 480, to = o.to || 1260, span = to - from;
    const pct = (m) => `${Math.max(0, Math.min(100, ((m - from) / span) * 100)).toFixed(2)}%`;
    const now = P.NOW.h * 60 + P.NOW.m;
    return `<div class="dayrail" role="img" aria-label="Сутки по часам: занятое время и свободные окна">
      <div class="track"></div>
      ${segs.map((s) => `<button type="button" class="seg ${s.kind} ${s.done ? 'done' : ''}" style="left:${pct(s.start)};width:calc(${pct(s.end)} - ${pct(s.start)})" title="${P.esc(s.title || '')}"${s.action ? P.act(s.action, s.args) : ''}></button>`).join('')}
      <div class="now" style="left:${pct(now)}" data-t="${P.NOW.label}"></div>
      <div class="ticks">${[8, 10, 12, 14, 16, 18, 20].map((h) => `<span>${String(h).padStart(2, '0')}</span>`).join('')}</div>
    </div>`;
  };

  P.visitRow = (b, o = {}) => {
    const c = P.clientOf(b.client), s = P.serviceOf(b.service), m = P.memberOf(b.member);
    const now = P.NOW.h * 60 + P.NOW.m;
    const inChair = b.start <= now && b.end > now && b.status !== 'completed';
    const acts = o.acts == null ? (b.status === 'new' ? P.btn('Подтвердить', { variant: 'secondary', size: 'xs', icon: 'check', action: 'confirmBooking', args: { id: b.id } }) : inChair ? P.btn('Завершить', { variant: 'secondary', size: 'xs', icon: 'check', action: 'completeBooking', args: { id: b.id } }) : '') : o.acts;
    return `<div class="visit click ${inChair ? 'now' : ''}" role="button" tabindex="0"${P.act('openBooking', { id: b.id })}>
      <div class="t num">${P.fmtTime(b.start)}<small>${P.fmtDurShort(b.end - b.start)}</small></div>
      <div class="who"><b>${P.esc(c.name)}${c.visits === 0 ? '<span class="tag-first">первый визит</span>' : ''}</b><span class="sub">${P.esc(s.name)}${o.member && m ? ` <i class="member-dot" style="--ev:var(--${m.tone})"></i>${P.esc(m.short)}` : ''}</span></div>
      <div class="acts">${P.status(b.status)}${acts}</div>
    </div>`;
  };

  P.bars = (data, o = {}) => {
    const max = Math.max(...data.map((d) => d.v));
    const min = Math.min(...data.map((d) => d.v));
    const base = o.zero ? 0 : Math.max(0, Math.floor((min - (max - min) * 0.5) / 100) * 100);
    const fmt = o.fmt || P.eur;
    const h = (v) => `${(((v - base) / (max - base || 1)) * 100).toFixed(0)}%`;
    return `<div class="bars-wrap ${o.scale === false ? 'no-scale' : ''}">${o.scale === false ? '' : `<div class="bars-scale" aria-hidden="true"><span>${fmt(max)}</span><span>${fmt(base)}</span></div>`}<div class="bars" role="img" aria-label="${P.esc(o.label || 'Ряд по периодам')}">${data.map((d, i) => `<div class="bar ${i === data.length - 1 ? 'on' : ''} ${o.thin && i % 2 ? 'no-label' : ''}" title="${P.esc(d.m)}: ${P.esc(fmt(d.v))}"><b>${fmt(d.v)}</b><i style="height:${h(d.v)}"></i><span>${d.m}</span></div>`).join('')}</div></div>`;
  };
  P.hbars = (rows, o = {}) => {
    const max = Math.max(...rows.map((r) => r.v));
    return `<div class="hbars">${rows.map((r) => `<div class="hbar ${r.tone ? 'tone-' + r.tone : ''}"><span>${P.esc(r.name)}${r.n ? ` <span class="muted">· ${r.n}</span>` : ''}</span><span class="val">${o.fmt ? o.fmt(r.v) : P.eur(r.v)}</span><div class="track"><i style="width:${((r.v / max) * 100).toFixed(0)}%"></i></div></div>`).join('')}</div>`;
  };
  P.spark = (vals, w = 160, h = 40) => {
    const max = Math.max(...vals), min = Math.min(...vals);
    const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * w).toFixed(1)},${(h - 4 - ((v - min) / (max - min || 1)) * (h - 8)).toFixed(1)}`);
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.join(' ')}" fill="none" stroke="var(--support)" stroke-width="2" stroke-linejoin="round"/><circle cx="${pts[pts.length - 1].split(',')[0]}" cy="${pts[pts.length - 1].split(',')[1]}" r="3" fill="var(--support-strong)"/></svg>`;
  };
  P.qr = () => { let s = ''; let seed = 7; for (let i = 0; i < 81; i++) { seed = (seed * 9301 + 49297) % 233280; const on = seed / 233280 > 0.5 || i < 3 || i % 9 < 1; s += `<i class="${on ? '' : 'o'}"></i>`; } return `<div class="qr light" aria-label="QR-код страницы записи">${s}</div>`; };

  P.worldName = (id) => { const w = (P.WORLDS || []).find((x) => x.id === id); return w ? w.name : 'по умолчанию'; };
  P.clientOf = (id) => P.CLIENTS.find((c) => c.id === id) || { name: 'Клиент', visits: 1 };
  P.serviceOf = (id) => P.SERVICES.find((s) => s.id === id) || { name: '', price: 0, duration: 0 };
  P.memberOf = (id) => (id === 'neve' ? P.SOLO : P.MEMBERS.find((m) => m.id === id));
})(window.P);

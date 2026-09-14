/* Календарь v2: день, неделя (лента и дорожки команды), команда, список. */
(function (P) {
  const { icon, btn, esc, act, status, avatar, fmtTime, fmtDur, eur, plural } = P;
  const NOW = () => P.NOW.h * 60 + P.NOW.m;
  const DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
  const DAYS_FULL = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
  const WEEK_DATES = [7, 8, 9, 10, 11, 12, 13];
  const TODAY = 12;
  const NAMES = ['Элина Круминя', 'Дарья Соколова', 'Инесе Заринья', 'Санта Озолиня', 'Анете Лиепиня', 'Мартиньш Берзиньш', 'Эдгар Приедитис', 'Лаура Витола', 'Юлия Новикова', 'Роберт Калнс'];

  /* Детерминированная неделя: для каждого мастера свой ритм, сегодня — из фикстур. */
  const weekFor = (c) => {
    const out = {};
    WEEK_DATES.forEach((d, di) => {
      if (d === TODAY) { out[d] = { bookings: c.bookings, slots: c.slots, blocks: c.blocks }; return; }
      if (di === 6) { out[d] = { bookings: [], slots: [], blocks: c.members.map((m) => ({ id: `wx${d}${m.id}`, member: m.id, start: 540, end: 1260, title: 'Выходной' })) }; return; }
      const bookings = [], slots = [], blocks = [];
      c.members.forEach((m, mi) => {
        const svc = c.services.filter((s) => s.performers.includes(m.id) && s.visible);
        if (!svc.length) return;
        let t = 600 + ((di * 7 + mi * 13) % 3) * 30;
        let k = 0;
        while (t < 1140) {
          const s = svc[(di + mi + k) % svc.length];
          const len = s.duration + (s.buffer || 0);
          const roll = (di * 31 + mi * 17 + k * 7) % 10;
          if (roll < 6) bookings.push({ id: `w${d}${m.id}${k}`, member: m.id, clientName: NAMES[(di * 3 + mi * 5 + k) % NAMES.length], service: s.id, start: t, end: t + s.duration, status: d < TODAY ? (roll === 5 ? 'noshow' : 'completed') : roll === 2 && d === 13 - 0 ? 'new' : d > TODAY && roll === 4 ? 'new' : 'confirmed' });
          else if (roll < 8 && d > TODAY) slots.push({ id: `ws${d}${m.id}${k}`, member: m.id, start: t, end: t + 60, hidden: roll === 7 && k % 3 === 0 });
          else if (roll === 9 && k === 2) blocks.push({ id: `wb${d}${m.id}`, member: m.id, start: t, end: t + 60, title: 'Обед' });
          t += Math.max(30, Math.round(len / 30) * 30) + (roll % 2 ? 30 : 0);
          k++;
        }
      });
      out[d] = { bookings, slots, blocks };
    });
    return out;
  };
  P.weekFor = weekFor;

  const laneTone = (id) => { const m = P.memberOf(id); return m ? m.tone : 'm1'; };
  const svcColor = (id) => P.serviceOf(id).color || 'transparent';

  P.SCREENS.calendar = {
    title: 'Календарь', hint: (st) => (P.ctx(st).team ? 'День команды: кто занят, где свободно' : 'Окна, в которые к вам можно записаться'),
    actions: () => btn('Рабочее время', { variant: 'secondary', icon: 'clock', action: 'sheet', args: { name: 'publishPeriod' } }) + btn('Запись', { variant: 'primary', icon: 'plus', action: 'sheet', args: { name: 'newBooking' } }),
    render(st) {
      const c = P.ctx(st);
      const view = st.ui.calView && st.ui.calView !== 'list' ? st.ui.calView : (c.team ? 'team' : 'day');
      const member = st.ui.calMember || 'all';
      const views = [...(st.caps.canViewTeamCalendar ? [['team', 'Команда']] : []), ['day', 'День'], ['week', 'Неделя']];
      const week = weekFor(c);
      const H = 60, top0 = 9 * 60, hours = Array.from({ length: 12 }, (_, i) => 9 + i);
      const px = (m) => ((m - top0) / 60) * H;
      const now = NOW();

      const soloMember = member;
      const toolbar = `
        <div class="cal-toolbar">
          ${btn('Сегодня', { size: 'sm', variant: 'secondary' })}
          <div class="row" style="gap:2px">${btn('', { size: 'sm', variant: 'ghost', icon: 'chevL', title: view === 'week' ? 'Предыдущая неделя' : 'Предыдущий день' })}${btn('', { size: 'sm', variant: 'ghost', icon: 'chevR', title: view === 'week' ? 'Следующая неделя' : 'Следующий день' })}</div>
          <div class="date">${view === 'week' ? '7 – 13 сентября' : '12 сентября'}<small>${view === 'week' ? 'эта неделя' : 'суббота · сегодня'}</small></div>
          <span style="flex:1"></span>
          ${c.team && !st.narrow ? P.seg([['all', 'Все'], ...c.members.map((m) => [m.id, m.short])], member, 'calMember') : ''}
          ${P.seg(views, view, 'calView')}
        </div>
        ${c.team && st.narrow && view === 'team' ? `<div class="cal-people">${P.seg([['all', 'Все'], ...c.members.map((m) => [m.id, m.short])], member, 'calMember')}</div>` : ''}
        <div class="daystrip">${WEEK_DATES.concat([14, 15, 16]).map((d, i) => { const n = week[d] ? week[d].bookings.length : 3; return `<button type="button" class="${d === TODAY ? 'on' : ''}"><span>${DAYS[i % 7]}</span><b>${d}</b><i style="${n ? '' : 'opacity:0'}"></i></button>`; }).join('')}</div>`;

      /* --- Событие --- */
      const ev = (b, o = {}) => {
        const s = P.serviceOf(b.service);
        const name = b.clientName || P.clientOf(b.client).name;
        const h = Math.max(20, px(b.end) - px(b.start) - 4);
        const compact = h < 40;
        const cur = b.start <= now && b.end > now && b.status === 'confirmed';
        return `<button type="button" class="ev busy ${compact ? 'compact' : ''} ${b.status === 'new' ? 'pending' : ''} ${b.status === 'completed' ? 'done' : ''} ${b.status === 'noshow' ? 'noshow' : ''} ${cur ? 'current' : ''} ${o.lane ? 'lane' : ''} ${c.team ? 'tone-' + laneTone(b.member) : ''}" style="top:${px(b.start)}px;height:${h}px;--svc:${svcColor(b.service)};${o.left != null ? `left:${o.left}%;width:calc(${o.width}% - 3px);` : ''}" title="${esc(name)} · ${esc(s.name)} · ${fmtTime(b.start)}–${fmtTime(b.end)}${o.member ? ` · ${esc(P.memberOf(b.member).short)}` : ''}"${act('openBooking', { id: b.id.startsWith('w') ? 'b6' : b.id })}>${o.lane ? '' : o.week ? `<b>${esc(name)}</b>` : `<b>${esc(name)}</b>${compact ? '' : `<span>${esc(s.name)}</span>`}${h >= 62 ? `<span class="t">${fmtTime(b.start)}–${fmtTime(b.end)}${o.member ? ` · ${esc(P.memberOf(b.member).short)}` : ''}</span>` : ''}`}${b.status === 'new' ? '<i class="pulse"></i>' : ''}</button>`;
      };
      const freeEv = (s, o = {}) => `<button type="button" class="ev free ${s.hidden ? 'hidden' : ''} ${o.lane ? 'lane' : ''}" style="top:${px(s.start)}px;height:${Math.max(20, px(s.end) - px(s.start) - 4)}px;${o.left != null ? `left:${o.left}%;width:calc(${o.width}% - 3px);` : ''}" title="Свободное окно ${fmtTime(s.start)}–${fmtTime(s.end)}"${act('sheet', { name: 'slotDetail', id: s.id.startsWith('w') ? 'f1' : s.id })}>${o.lane ? '' : `${s.hidden ? icon('eyeOff') : ''}${fmtTime(s.start)}`}</button>`;
      const blockEv = (x, o = {}) => `<div class="ev block ${o.lane ? 'lane' : ''}" style="top:${px(x.start)}px;height:${Math.max(20, px(x.end) - px(x.start) - 4)}px;${o.left != null ? `left:${o.left}%;width:calc(${o.width}% - 3px);` : ''}" role="button" tabindex="0" title="${esc(x.title)} ${fmtTime(x.start)}–${fmtTime(x.end)}"${act('sheet', { name: 'blockDetail', id: x.id.startsWith('w') ? 'x1' : x.id })}>${o.lane ? '' : `<b>${esc(x.title)}</b>`}</div>`;

      const colContent = (data, memberId, o = {}) => [
        ...data.blocks.filter((x) => x.member === memberId).map((x) => blockEv(x, o)),
        ...data.slots.filter((s) => s.member === memberId).map((s) => freeEv(s, o)),
        ...data.bookings.filter((b) => b.member === memberId).map((b) => ev(b, o)),
      ].join('');

      const hoursCol = `<div class="hours">${hours.map((h) => `<div>${String(h).padStart(2, '0')}:00</div>`).join('')}</div>`;
      const nowLine = `<div class="now-line" style="top:${px(now)}px"></div>`;

      /* --- День / Команда (колонки — люди) --- */
      const grid = (cols) => `
        <div class="cal" style="--h:${H}px;--n:12">
          <div></div>
          <div class="heads">${cols.map((m) => { const bs = c.bookings.filter((b) => b.member === m.id); const busy = bs.reduce((s2, b) => s2 + (b.end - b.start), 0); return `<div class="head ${cols.length > 1 ? 'tone-' + m.tone : 'today'}">${cols.length > 1 ? avatar(m, 'sm') : ''}<div class="txt"><b>${cols.length > 1 ? esc(m.short) : 'Сегодня, 12 сентября'}</b><small>${cols.length > 1 ? `${bs.length} ${plural(bs.length, ['запись', 'записи', 'записей'])} · ${Math.round(busy / 6) / 10} ч` : `${bs.length} ${plural(bs.length, ['запись', 'записи', 'записей'])} · свободно ${c.slots.filter((s) => s.member === m.id).length}`}</small></div><div class="loadbar"><i style="width:${Math.min(100, Math.round((busy / 600) * 100))}%"></i></div></div>`; }).join('')}</div>
          ${hoursCol}
          <div class="cols">${cols.map((m) => `<div class="col"${act('menuAt', { name: 'emptySlot', member: m.id })}>${colContent({ bookings: c.bookings, slots: c.slots, blocks: c.blocks }, m.id)}</div>`).join('')}${nowLine}</div>
        </div>`;

      /* --- Неделя --- */
      const weekView = () => {
        const lanes = c.team && member === 'all';
        const who = lanes ? c.members : c.team ? c.members.filter((m) => m.id === member) : c.members;
        const laneW = 100 / who.length;
        const dayCol = (d, di) => {
          const data = week[d];
          const past = d < TODAY, today = d === TODAY, off = di === 6;
          const inner = off ? `<div class="ev block full"><b>Выходной</b></div>` : who.map((m, mi) => colContent(data, m.id, lanes ? { lane: true, left: mi * laneW, width: laneW } : { week: true })).join('');
          return `<div class="wk-col ${past ? 'past' : ''} ${today ? 'today' : ''}"${off ? '' : act('menuAt', { name: 'emptySlot', member: who[0].id })}>${inner}${today ? nowLine : ''}</div>`;
        };
        const head = WEEK_DATES.map((d, di) => {
          const data = week[d]; const bs = data.bookings.filter((b) => who.some((m) => m.id === b.member)); const fs = data.slots.filter((s) => who.some((m) => m.id === s.member) && !s.hidden);
          const income = bs.filter((b) => b.status !== 'new' && b.status !== 'noshow').reduce((s2, b) => s2 + P.serviceOf(b.service).price, 0);
          return `<div class="wk-dh ${d === TODAY ? 'today' : ''} ${d < TODAY ? 'past' : ''}"><div class="dn"><span>${DAYS[di]}</span><b>${d}</b></div><div class="dm">${di === 6 ? 'выходной' : `${bs.length} ${plural(bs.length, ['запись', 'записи', 'записей'])}${fs.length ? ` · ${fs.length} ${plural(fs.length, ['окно', 'окна', 'окон'])}` : ''}`}</div>${di === 6 ? '' : `<div class="dm money">${income ? eur(income) : '—'}</div>`}</div>`;
        }).join('');
        if (st.narrow) {
          const load = WEEK_DATES.map((d, di) => { const data = week[d]; const bs = data.bookings.filter((b) => who.some((m) => m.id === b.member)); const fs = data.slots.filter((x) => who.some((m) => m.id === x.member) && !x.hidden); const income = bs.filter((b) => b.status !== 'new' && b.status !== 'noshow').reduce((s2, b) => s2 + P.serviceOf(b.service).price, 0); return { d, di, n: bs.length, f: fs.length, income, off: di === 6 }; });
          const maxN = Math.max(1, ...load.map((x) => x.n));
          return `<div class="cell mb12"><div class="cell-head"><div class="titles"><h2 class="t-section">Неделя 7–13 сентября</h2><div class="t-meta mt-2">${P.countOf(load.reduce((a2, x) => a2 + x.n, 0), ['запись', 'записи', 'записей'])} · ${eur(load.reduce((a2, x) => a2 + x.income, 0))}</div></div></div>
            <div class="wk-load">${load.map((x) => `<button type="button" class="wl ${x.d === TODAY ? 'on' : ''} ${x.off ? 'off' : ''}"${act('calView', { value: 'day' })}><span class="dn">${DAYS[x.di]}</span><b>${x.d}</b><i style="height:${x.off ? 3 : Math.max(6, (x.n / maxN) * 100)}%"></i><span class="n">${x.off ? '—' : x.n}</span></button>`).join('')}</div>
            <div class="wk-load-cap"><span>записей в день</span><span>свободных окон за неделю: ${load.reduce((a2, x) => a2 + x.f, 0)}</span></div>
          </div>
          <div class="cell">${WEEK_DATES.map((d, di) => { const data = week[d]; const bs = data.bookings.filter((b) => who.some((m) => m.id === b.member)).sort((a, b) => a.start - b.start); const fs = data.slots.filter((s) => who.some((m) => m.id === s.member) && !s.hidden); const off = di === 6; return `<div class="agenda-day ${d === TODAY ? 'today' : ''}"><h3><b>${DAYS_FULL[di]}, ${d}</b>${d === TODAY ? ' <span class="chip xs">сегодня</span>' : ''} <span class="n">${off ? 'выходной' : `${bs.length} ${plural(bs.length, ['запись', 'записи', 'записей'])}${fs.length ? ` · ${fs.length} ${plural(fs.length, ['окно', 'окна', 'окон'])}` : ''}`}</span></h3>${off ? '' : `<div class="agenda-rows">${bs.map((b) => `<button type="button" class="agenda-row ${b.status}"${act('openBooking', { id: b.id.startsWith('w') ? 'b6' : b.id })}><span class="num">${fmtTime(b.start)}</span><i class="member-dot" style="--ev:var(--${laneTone(b.member)})"></i><b>${esc(b.clientName || P.clientOf(b.client).name)}</b><span class="svc">${esc(P.serviceOf(b.service).name)}</span></button>`).join('')}${fs.length ? `<div class="agenda-free">${fs.slice(0, 4).map((f) => `<button type="button" class="chip xs"${act('sheet', { name: 'slotDetail', id: f.id.startsWith('w') ? 'f1' : f.id })}>${fmtTime(f.start)}</button>`).join('')}${fs.length > 4 ? `<span class="t-meta">ещё ${fs.length - 4}</span>` : ''}</div>` : ''}</div>`}</div>`; }).join('')}</div>`;
        }
        const legend = lanes ? `<div class="wk-legend">${who.map((m) => `<span><i class="lane ${m.tone}"></i>${esc(m.short)}</span>`).join('')}<span class="muted" style="margin-left:auto">Дорожки по мастерам · наведите на блок, нажмите — откроется запись</span></div>` : c.team ? `<div class="wk-legend">${who.map((m) => `<span><i class="lane ${m.tone}"></i>${esc(m.short)}</span>`).join('')}</div>` : '';
        return `<div class="cell flush wk-wrap">
          ${legend}
          <div class="wk" style="--h:${H}px;--n:12">
            <div class="wk-head"><div class="wk-corner"></div>${head}</div>
            <div class="wk-body">${hoursCol}${WEEK_DATES.map(dayCol).join('')}</div>
          </div>
        </div>`;
      };

      const agendaDay = (who) => {
        const bs = c.bookings.filter((b) => who.some((m) => m.id === b.member)).sort((a, b) => a.start - b.start);
        const fs = c.slots.filter((x) => who.some((m) => m.id === x.member) && !x.hidden);
        const xs = c.blocks.filter((x) => who.some((m) => m.id === x.member));
        const rows = [...bs.map((b) => ({ t: b.start, kind: 'b', b })), ...xs.map((x) => ({ t: x.start, kind: 'x', x }))].sort((p, q) => p.t - q.t);
        return `<div class="cell">
          ${rows.length ? `<div class="agenda-rows big">${rows.map((r) => r.kind === 'x'
            ? `<button type="button" class="agenda-row block"${act('sheet', { name: 'blockDetail', id: r.x.id })}><span class="num">${fmtTime(r.x.start)}</span><b>${esc(r.x.title)}</b><span class="svc">до ${fmtTime(r.x.end)}</span></button>`
            : `<button type="button" class="agenda-row ${r.b.status}"${act('openBooking', { id: r.b.id })}><span class="num">${fmtTime(r.b.start)}<small>${P.fmtDurShort(r.b.end - r.b.start)}</small></span>${c.team ? `<i class="member-dot" style="--ev:var(--${laneTone(r.b.member)})"></i>` : ''}<b>${esc(P.clientOf(r.b.client).name)}</b><span class="svc">${esc(P.serviceOf(r.b.service).name)}</span>${status(r.b.status)}</button>`).join('')}</div>`
            : P.empty('Сегодня записей нет', 'Откройте время, чтобы клиенты могли записаться.', btn('Открыть время', { variant: 'primary', size: 'sm', icon: 'clock', action: 'sheet', args: { name: 'publishSlot' } }))}
          ${fs.length ? `<div class="cat-head">Свободные окна <span class="n">${fs.length}</span></div><div class="chips">${fs.map((f) => `<button type="button" class="chip free"${act('sheet', { name: 'slotDetail', id: f.id })}>${fmtTime(f.start)}–${fmtTime(f.end)}</button>`).join('')}</div>` : ''}
        </div>`;
      };
      let body = '';
      const teamCols = member !== 'all' ? c.members.filter((m) => m.id === member) : c.members;
      if (st.narrow && view !== 'week') body = agendaDay(c.team && member !== 'all' ? c.members.filter((m) => m.id === member) : c.members);
      else if (view === 'team') body = `<div class="cell flush cal-wrap">${grid(teamCols)}</div>`;
      else if (view === 'day') { const who = c.team ? c.members.find((m) => m.id === (member !== 'all' ? member : 'anna')) : c.members[0]; body = `<div class="cell flush cal-wrap day-one">${grid([who])}</div>`; }
      else body = weekView();

      const summary = view === 'week' ? '' : `<div class="cal-summary">${[
        ['Записей сегодня', c.bookings.length, ''],
        ['Ждут ответа', c.bookings.filter((b) => b.status === 'new').length, 'wait'],
        ['Свободных окон', c.slots.filter((s) => !s.hidden).length, ''],
        ['Ожидаемый доход', eur(c.bookings.filter((b) => b.status !== 'new').reduce((s2, b) => s2 + P.serviceOf(b.service).price, 0)), 'lilac'],
      ].map(([k, v, tone]) => `<div class="cs ${tone}"><span>${k}</span><b class="money">${v}</b></div>`).join('')}</div>`;
      return st.narrow ? toolbar + body + summary : toolbar + summary + body;
    },
  };

  /* ============================================================ ЗАПИСИ */
  const FILTERS = [['all', 'Все'], ['new', 'Новые'], ['confirmed', 'Подтверждённые'], ['completed', 'Завершённые'], ['cancelled', 'Отменённые']];
  P.SCREENS.bookings = {
    title: 'Записи', hint: 'Все записи: новые, будущие и прошедшие',
    actions: () => btn('CSV', { variant: 'ghost', icon: 'download', action: 'toast', args: { msg: 'Файл bookings.csv скачивается' } }) + btn('Запись', { variant: 'primary', icon: 'plus', action: 'sheet', args: { name: 'newBooking' } }),
    render(st) {
      const c = P.ctx(st);
      const f = st.ui.bkFilter || 'all';
      const week = weekFor(c);
      const q = (st.ui.bkQ || '').trim().toLowerCase();
      const nameOf = (b) => b.clientName || P.clientOf(b.client).name;
      const match = (b) => !q || [nameOf(b), P.serviceOf(b.service).name, (P.clientOf(b.client) || {}).phone].some((x) => String(x || '').toLowerCase().includes(q));
      const next = week[10].bookings.slice(0, 3).map((b, i) => ({ ...b, day: ['пн 14', 'пн 14', 'вт 15'][i], start: [660, 720, 600][i], status: 'confirmed' }));
      const past = week[9].bookings.slice(0, 3).map((b, i) => ({ ...b, day: ['чт 10', 'ср 9', 'ср 9'][i], start: [660, 900, 600][i], status: ['completed', 'noshow', 'completed'][i] }));
      const cancelled = [{ id: 'cx1', clientName: 'Роберт Калнс', service: c.team ? 's-cut-m' : 's-mani', member: c.team ? 'davis' : 'neve', day: 'пт 11', start: 1080, status: 'cancelled' }];
      const all = [...c.bookings, ...next, ...past, ...cancelled];
      const counts = FILTERS.reduce((acc, [v]) => { acc[v] = all.filter((b) => (v === 'all' || b.status === v || (v === 'cancelled' && b.status === 'noshow')) && match(b)).length; return acc; }, {});
      const keep = (b) => (f === 'all' || b.status === f || (f === 'cancelled' && b.status === 'noshow')) && match(b);
      const other = (b) => `<div class="visit click" role="button" tabindex="0"${act('openBooking', { id: b.id.startsWith('w') || b.id.startsWith('c') ? (st.role === 'solo' ? 'n3' : 'b6') : b.id })}><div class="t num" style="font-size:13px">${b.day}<small>${fmtTime(b.start)}</small></div><div class="who"><b>${esc(b.clientName)}</b><span>${esc(P.serviceOf(b.service).name)}${c.team ? ` <i class="member-dot" style="--ev:var(--${laneTone(b.member)})"></i>${esc(P.memberOf(b.member).short)}` : ''}</span></div><div class="acts">${status(b.status)}</div></div>`;
      const groups = [
        ['Ждут подтверждения', c.bookings.filter((b) => b.status === 'new' && keep(b)).map((b) => P.visitRow(b, { member: c.team }))],
        ['Сегодня', c.bookings.filter((b) => b.status !== 'new' && keep(b)).sort((a, b) => a.start - b.start).map((b) => P.visitRow(b, { member: c.team }))],
        ['Дальше', next.filter(keep).map(other)],
        ['Прошедшие', past.filter(keep).map(other)],
        ['Отменённые', cancelled.filter(keep).map(other)],
      ].filter(([, rows]) => rows.length);
      return `<div class="cell">
        <div class="input-wrap mb12">${icon('search', 'lead')}${P.liveInput('bkQ', { placeholder: 'Имя, телефон или услуга', cls: 'inline' })}</div>
        <div class="chips scroll mb16">${FILTERS.map(([v, l]) => `<button type="button" class="chip xs ${v === f ? 'on' : ''}"${act('bkFilter', { value: v })}>${l} <span class="n">${counts[v]}</span></button>`).join('')}</div>
        ${groups.length ? groups.map(([g, rows]) => `<div class="cat-head">${g} <span class="n">${rows.length}</span></div><div class="list">${rows.join('')}</div>`).join('') : P.empty(q ? `По запросу «${esc(st.ui.bkQ)}» ничего нет` : 'Таких записей нет', q ? 'Проверьте имя или телефон — поиск ищет по клиенту и услуге.' : 'Снимите фильтр или создайте запись.', q ? btn('Очистить поиск', { variant: 'secondary', size: 'sm', action: 'setUi', args: { key: 'bkQ', value: '' } }) : btn('Новая запись', { variant: 'primary', size: 'sm', icon: 'plus', action: 'sheet', args: { name: 'newBooking' } }))}
        <div class="pager"><span>${q ? `найдено ${P.countOf(counts[f], ['запись', 'записи', 'записей'])}` : `показаны все ${P.countOf(counts[f], ['запись', 'записи', 'записей'])}`}</span></div>
      </div>`;
    },
  };
})(window.P);

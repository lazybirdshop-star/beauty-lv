/* Экраны кабинета мастера и салона. Каждый экран — { title, hint, actions(st), render(st) }. */
(function (P) {
  const { icon, btn, esc, act, cellHead, status, avatar, fmtTime, fmtDur, eur } = P;
  const NOW = () => P.NOW.h * 60 + P.NOW.m;

  /* Данные в зависимости от роли */
  P.clientsOf = (st) => (st.role === 'solo' ? P.CLIENTS.filter((c) => c.solo) : P.CLIENTS);
  P.upcomingOf = (st, c) => { const b = P.ctx(st).bookings.filter((x) => x.client === c.id && x.status !== 'cancelled' && x.start > NOW()).sort((x, y) => x.start - y.start)[0]; return b ? `сегодня ${fmtTime(b.start)}` : c.id === 'k5' ? '15 сен 11:00' : ''; };
  P.orgOf = (st) => (st.role === 'solo' ? { name: 'Neve Nails', slug: 'neve', me: P.SOLO } : { name: 'Lumen Studio', slug: 'lumen-studio', me: P.memberOf('marta') });
  P.ctx = (st) => {
    if (st.role === 'platform') return { bookings: [], slots: [], blocks: [], members: [], services: [], team: false, me: P.PLATFORM_ME };
    if (st.role === 'solo') return { bookings: P.SOLO_BOOKINGS, slots: P.SOLO_SLOTS, blocks: P.SOLO_BLOCKS, members: [P.SOLO], services: P.SOLO_SERVICES, team: false, me: P.SOLO };
    const me = P.memberOf(st.role === 'owner' ? 'marta' : st.role === 'admin' ? 'ieva' : 'anna');
    if (st.role === 'master') return { bookings: P.BOOKINGS.filter((b) => b.member === 'anna'), slots: P.SLOTS.filter((s) => s.member === 'anna'), blocks: P.BLOCKS.filter((b) => b.member === 'anna'), members: [me], services: P.SERVICES, team: false, me };
    return { bookings: P.BOOKINGS, slots: P.SLOTS, blocks: P.BLOCKS, members: P.MEMBERS.filter((m) => !m.invited && m.role !== 'admin'), services: P.SERVICES, team: true, me };
  };
  const greet = (name) => (P.NOW.h < 12 ? `Доброе утро, ${name}` : P.NOW.h < 18 ? `Добрый день, ${name}` : `Добрый вечер, ${name}`);

  /* ============================================================ СЕГОДНЯ */
  P.SCREENS.home = {
    title: 'Сегодня', hint: 'Что сегодня и как идут дела',
    actions: () => btn('Новая запись', { variant: 'primary', icon: 'plus', action: 'sheet', args: { name: 'newBooking' } }),
    render(st) {
      const c = P.ctx(st);
      const now = NOW();
      const todays = c.bookings.filter((b) => b.status !== 'cancelled').sort((a, b) => a.start - b.start);
      const pending = todays.filter((b) => b.status === 'new');
      const inChair = todays.filter((b) => b.start <= now && b.end > now && b.status !== 'completed');
      const next = todays.filter((b) => b.start > now && b.status !== 'new');
      const done = todays.filter((b) => b.status === 'completed');
      const awaiting = todays.filter((b) => b.end <= now && b.status === 'confirmed');
      const income = done.reduce((s, b) => s + P.serviceOf(b.service).price, 0);
      const expected = todays.filter((b) => b.status !== 'new').reduce((s, b) => s + P.serviceOf(b.service).price, 0);
      const nextOne = next[0];
      const railSegs = c.team
        ? [...c.bookings.map((b) => ({ kind: `busy tone-${P.memberOf(b.member).tone}`, start: b.start, end: b.end, done: b.status === 'completed', title: `${P.clientOf(b.client).name}, ${P.memberOf(b.member).short}`, action: 'openBooking', args: { id: b.id } }))]
        : [...c.blocks.map((b) => ({ kind: 'block', start: b.start, end: b.end, title: b.title })), ...c.bookings.map((b) => ({ kind: 'busy', start: b.start, end: b.end, done: b.status === 'completed', title: P.clientOf(b.client).name, action: 'openBooking', args: { id: b.id } })), ...c.slots.map((s) => ({ kind: 'free', start: s.start, end: s.end, title: 'Свободное окно', action: 'sheet', args: { name: 'slotDetail', id: s.id } }))];
      const freeGap = c.team ? null : { from: 990, to: 1080 };

      return `
      <div class="grid c12">
        <section class="cell span-8" aria-label="Линейка дня">
          <div class="row between wrap">
            <div>
              <div class="t-display greet">${greet(c.me.short)}</div>
              <div class="t-hint mt8">${P.NOW.dateLong} · ${todays.length} ${plural(todays.length, ['запись', 'записи', 'записей'])} · ${fmtTime(Math.min(...todays.map((b) => b.start)))}–${fmtTime(Math.max(...todays.map((b) => b.end)))}${c.team ? ` · ${c.members.length} мастера работают` : ''}</div>
            </div>
            ${pending.length ? `<div class="chip rose wrap">${icon('bell')} Ждут ответа: ${pending.length}</div>` : ''}
          </div>
          ${P.dayRail(railSegs)}
          <div class="rail-legend">${c.team ? c.members.map((m) => `<span><i class="tone-${m.tone}"></i>${esc(m.short)}</span>`).join('') : '<span><i class="busy"></i>Занято</span><span><i class="free"></i>Свободное окно</span><span><i class="block"></i>Заблокировано</span>'}</div>
          ${nextOne ? `<div class="hero-next" role="button" tabindex="0"${act('openBooking', { id: nextOne.id })}>${avatar(P.clientOf(nextOne.client), 'lg')}<div class="who"><div class="big">${fmtTime(nextOne.start)}<small>через ${fmtDur(nextOne.start - now)}${c.team ? ` · ${esc(P.memberOf(nextOne.member).short)}` : ''}</small></div><b>${esc(P.clientOf(nextOne.client).name)}</b><span>${esc(P.serviceOf(nextOne.service).name)} · ${fmtDur(nextOne.end - nextOne.start)} · ${eur(P.serviceOf(nextOne.service).price)}${nextOne.note ? ` · «${esc(nextOne.note)}»` : ''}</span></div><div class="acts row">${btn('Открыть', { size: 'sm', variant: 'secondary', action: 'openBooking', args: { id: nextOne.id } })}${btn('', { size: 'sm', variant: 'ghost', icon: 'phone', title: 'Позвонить' })}</div></div>` : ''}
        </section>

        <section class="cell lilac span-4">
          <div class="stat"><div class="k">${c.team ? 'Доход салона сегодня' : 'Доход сегодня'}</div><div class="v money">${eur(income)}</div><div class="d">ожидается ${eur(expected)} · сделано ${done.length} из ${todays.filter((b) => b.status !== 'new').length}</div></div>
          <div class="mt16 income-spark" style="opacity:.8">${P.spark(P.FINANCE.byMonth.slice(-8).map((x) => x.v))}</div>
        </section>

        ${pending.length ? `
        <section class="cell needs span-12" aria-labelledby="need">
          ${cellHead(`<span id="need">Нужен ответ</span> <span class="badge" style="vertical-align:2px">${pending.length}</span>`, 'Клиент записался и ждёт вашего решения', { label: 'Все записи', action: 'nav', args: { name: 'bookings' } })}
          <div class="grid c2">
            ${pending.map((b) => { const cl = P.clientOf(b.client), s = P.serviceOf(b.service); return `
              <div class="cell tight">
                <div class="row between"><div><b style="font-weight:500">${esc(cl.name)}</b>${cl.visits === 0 ? ' <span class="chip xs">первый визит</span>' : ''}<div class="t-meta mt8">${esc(s.name)} · сегодня ${fmtTime(b.start)}–${fmtTime(b.end)}${c.team ? ` · ${esc(P.memberOf(b.member).short)}` : ''}</div><div class="t-meta">со страницы записи, ${esc(b.created.replace(', клиент', ''))}</div></div></div>
                <div class="row mt12">${btn('Подтвердить', { variant: 'secondary', size: 'sm', icon: 'check', action: 'confirmBooking', args: { id: b.id } })}${btn('Отклонить', { variant: 'ghost', size: 'sm', action: 'dialog', args: { name: 'declineBooking', id: b.id } })}<span class="spacer" style="flex:1"></span>${btn('', { variant: 'ghost', size: 'sm', icon: 'phone', title: 'Позвонить' })}</div>
              </div>`; }).join('')}
          </div>
        </section>` : ''}

        <section class="cell span-7" aria-labelledby="dayplan">
          ${cellHead('<span id="dayplan">День по порядку</span>', c.team ? 'Кто сейчас работает и что дальше' : `С ${fmtTime(Math.min(...todays.map((b) => b.start)))} до ${fmtTime(Math.max(...todays.map((b) => b.end)))}, без пропусков`, { label: 'Открыть календарь', action: 'nav', args: { name: 'calendar' } })}
          ${inChair.length ? `<div class="t-meta mb8">Сейчас в кресле (${inChair.length})</div>` : ''}
          <div class="list">${inChair.map((b) => P.visitRow(b, { member: c.team })).join('')}</div>
          ${awaiting.length ? `<div class="t-meta mt16 mb8">Ждут отметки (${awaiting.length})</div><div class="list">${awaiting.map((b) => P.visitRow(b, { member: c.team, acts: btn('Завершить', { size: 'xs', variant: 'secondary', action: 'completeBooking', args: { id: b.id } }) + btn('Не пришёл', { size: 'xs', variant: 'ghost', action: 'noShow', args: { id: b.id } }) })).join('')}</div>` : ''}
          <div class="t-meta mt16 mb8">Дальше (${next.length})</div>
          <div class="list">
            ${next.slice(0, 5).map((b, i) => { const row = P.visitRow(b, { member: c.team }); const gap = !c.team && freeGap && b.start > freeGap.to && (i === 0 || next[i - 1].end <= freeGap.from) ? `<div class="gap-row"><span>Свободно ${fmtTime(freeGap.from)}–${fmtTime(freeGap.to)}</span><span class="line"></span>${btn('Открыть для онлайн-записи', { size: 'xs', variant: 'secondary', action: 'toast', args: { msg: `Открыто ${fmtTime(freeGap.from)}–${fmtTime(freeGap.to)}`, undo: true } })}</div>` : ''; return gap + row; }).join('')}
            ${next.length === 0 ? P.empty('На сегодня больше нет записей.', '') : ''}
          </div>
          ${done.length ? `<div class="row mt16"><span class="t-meta">Завершено: ${done.length}</span><span class="spacer" style="flex:1"></span>${btn('Показать завершённые', { size: 'xs', variant: 'ghost', action: 'nav', args: { name: 'bookings', filter: 'completed' } })}</div>` : ''}
        </section>

        <div class="span-5 stack">
          ${c.team ? `
          <section class="cell" aria-labelledby="teamtoday">
            ${cellHead('<span id="teamtoday">Команда сегодня</span>', 'Кто работает и как загружен', { label: 'Командный день', action: 'nav', args: { name: 'calendar', view: 'team' } })}
            <div class="list">
              ${c.members.map((m) => { const mb = P.BOOKINGS.filter((b) => b.member === m.id); const cur = mb.find((b) => b.start <= now && b.end > now && b.status !== 'completed'); const cnt = mb.length; const busyMin = mb.reduce((s, b) => s + (b.end - b.start), 0); return `
                <button type="button" class="list-row click" style="grid-template-columns:auto 1fr auto"${act('nav', { name: 'member', id: m.id })}>
                  ${avatar(m)}
                  <div><div class="main-line"><span class="member-dot" style="--ev:var(--${m.tone})"></span>${esc(m.short)}</div><div class="sub-line">${cur ? `в кресле до ${fmtTime(cur.end)} · ${esc(P.clientOf(cur.client).name.split(' ')[0])}` : mb.filter((b) => b.start > now).length ? `следующая ${fmtTime(mb.filter((b) => b.start > now)[0].start)}` : 'сегодня свободна'}</div></div>
                  <div class="t-meta num">${cnt} ${plural(cnt, ['запись', 'записи', 'записей'])} · ${Math.round(busyMin / 60 * 10) / 10} ч</div>
                </button>`; }).join('')}
            </div>
          </section>` : `
          <section class="cell" aria-labelledby="time">
            ${cellHead('<span id="time">Время</span>', 'Что открыто, а что нет', { label: 'Календарь', action: 'nav', args: { name: 'calendar' } })}
            <div class="t-body">Открыто окон: <b style="font-weight:500">${c.slots.filter((s) => !s.hidden).length}</b> сегодня и <b style="font-weight:500">9</b> на неделе вперёд.${c.slots.some((s) => s.hidden) ? ` Скрыто от клиентов: ${c.slots.filter((s) => s.hidden).length}.` : ''}</div>
            <div class="row mt12 wrap">${btn('Открыть время', { variant: 'secondary', size: 'sm', icon: 'plus', action: 'sheet', args: { name: 'publishSlot' } })}${btn('Заблокировать', { variant: 'ghost', size: 'sm', action: 'sheet', args: { name: 'blockTime' } })}</div>
          </section>`}

          ${st.caps.canManagePage ? `
          <section class="cell" aria-labelledby="pagecard">
            ${cellHead('<span id="pagecard">Страница записи</span>', '', { label: 'Открыть', action: 'toast', args: { msg: 'Открыли бы страницу в новой вкладке' } })}
            <div class="row" style="align-items:flex-start;gap:16px">
              ${P.qr()}
              <div style="flex:1;min-width:0">
                <div class="link-box"><span class="grow">amolie.com/<b>${P.orgOf(st).slug}</b></span>${btn('', { size: 'xs', variant: 'ghost', icon: 'copy', title: 'Скопировать ссылку', action: 'toast', args: { msg: 'Скопировано' } })}</div>
                <div class="t-hint mt8">${status('ok', 'Опубликована')} <span class="muted">· ${P.countOf(c.services.filter((s) => s.visible).length, ['услуга видна', 'услуги видны', 'услуг видно'])} клиентам</span></div>
                <div class="row mt12">${btn('Поделиться', { size: 'xs', variant: 'secondary', icon: 'share', action: 'toast', args: { msg: 'Ссылка отправлена в системное меню «Поделиться»' } })}${btn('Студия', { size: 'xs', variant: 'ghost', icon: 'wand', action: 'nav', args: { name: 'studio' } })}</div>
              </div>
            </div>
          </section>` : ''}

          <section class="cell" aria-labelledby="tmr">
            ${cellHead('<span id="tmr">Завтра</span>', 'воскресенье, 13 сентября')}
            ${st.role === 'master' || st.role === 'solo' ? '<div class="t-hint">Завтра записей нет — выходной. Окна на понедельник открыты с 10:00.</div>' : '<div class="t-hint">3 записи · Анна и Давис · с 11:00 до 16:30</div>'}
          </section>
        </div>
      </div>`;
    },
  };

  const plural = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; return f[a > 10 && a < 20 ? 2 : b > 1 && b < 5 ? 1 : b === 1 ? 0 : 2]; };
  P.plural = plural;

  /* Календарь и записи живут в calendar.js */

  /* ============================================================ РЕСЕПШЕН */
  P.SCREENS['front-desk'] = {
    title: 'Ресепшен', hint: 'Кто сейчас в креслах, кого ждать и кого отметить',
    actions: () => btn('Новая запись', { variant: 'primary', icon: 'plus', action: 'sheet', args: { name: 'newBooking' } }),
    render(st) {
      const c = P.ctx(st), now = NOW();
      const inChair = c.bookings.filter((b) => b.start <= now && b.end > now && b.status !== 'completed');
      const awaiting = c.bookings.filter((b) => b.end <= now && b.status === 'confirmed');
      const next = c.bookings.filter((b) => b.start > now).sort((a, b) => a.start - b.start);
      const done = c.bookings.filter((b) => b.status === 'completed');
      return `
      <div class="desk-clock"><div class="now"><b>${P.NOW.label}</b><span>суббота, 12 сентября</span></div><div class="chips"><span class="chip xs">завершено ${done.length}</span><span class="chip xs">впереди ${next.length}</span>${awaiting.length ? `<span class="chip xs rose">ждут отметки ${awaiting.length}</span>` : ''}</div></div>
      <div class="desk-grid">
        <div class="stack">
          <section class="cell">
            ${cellHead('Сейчас в креслах', `${inChair.length} из ${c.members.length} мастеров заняты`)}
            <div class="stack" style="gap:8px">
              ${c.members.map((m) => { const b = inChair.find((x) => x.member === m.id); if (!b) return `<div class="chair free tone-${m.tone}">${avatar(m)}<div><b>${esc(m.short)}</b><div class="meta">свободна · ${next.find((x) => x.member === m.id) ? `следующая ${fmtTime(next.find((x) => x.member === m.id).start)}` : 'сегодня больше нет записей'}</div></div><div></div></div>`; const cl = P.clientOf(b.client), s = P.serviceOf(b.service); const p = Math.round(((now - b.start) / (b.end - b.start)) * 100); return `
                <div class="chair busy tone-${m.tone}"><span class="ring" style="--p:${p}" aria-hidden="true"></span><div style="min-width:0"><b>${esc(cl.name)}</b><div class="meta"><i class="member-dot"></i>${esc(m.short)} · ${esc(s.name)}</div><div class="left">осталось ${fmtDur(b.end - now)} · до ${fmtTime(b.end)}</div><div class="progress"><i style="width:${p}%"></i></div></div><div class="row acts">${btn('Завершить', { size: 'xs', variant: 'secondary', action: 'completeBooking', args: { id: b.id } })}${btn('', { size: 'xs', variant: 'ghost', icon: 'more', title: 'Ещё', action: 'menuAt', args: { name: 'bookingRow', id: b.id } })}</div></div>`; }).join('')}
            </div>
          </section>
          ${awaiting.length ? `<section class="cell rose">${cellHead('Ждут отметки', 'Визит закончился по времени — отметьте, как прошёл')}<div class="list">${awaiting.map((b) => P.visitRow(b, { member: true, acts: btn('Завершить', { size: 'xs', variant: 'secondary', icon: 'check', action: 'completeBooking', args: { id: b.id } }) + btn('Не пришёл', { size: 'xs', variant: 'ghost', action: 'noShow', args: { id: b.id } }) })).join('')}</div></section>` : ''}
        </div>
        <section class="cell">
          ${cellHead('Дальше сегодня', `${next.length} ${plural(next.length, ['визит', 'визита', 'визитов'])} до ${fmtTime(Math.max(...next.map((b) => b.end)))}`)}
          <div class="list wrap-names">${next.map((b) => P.visitRow(b, { member: true, acts: b.status === 'new' ? btn('Подтвердить', { size: 'xs', variant: 'secondary', icon: 'check', action: 'confirmBooking', args: { id: b.id } }) : btn('', { size: 'xs', variant: 'ghost', icon: 'phone', title: 'Позвонить' }) })).join('')}</div>
          ${done.length ? `<div class="cat-head mt16">Завершено сегодня <span class="n">${done.length}</span></div><div class="list">${done.sort((a, b) => b.start - a.start).map((b) => P.visitRow(b, { member: true, acts: '' })).join('')}</div>` : ''}
        </section>
      </div>`;
    },
  };

  /* ============================================================ КЛИЕНТЫ */
  P.SCREENS.clients = {
    title: 'Клиенты', hint: 'Ваша база: заметки и история визитов',
    actions: () => btn('CSV', { variant: 'ghost', icon: 'download', action: 'toast', args: { msg: 'Файл clients.csv скачивается' } }) + btn('Добавить клиента', { variant: 'primary', icon: 'plus', action: 'sheet', args: { name: 'clientForm' } }),
    render(st) {
      const base = P.clientsOf(st);
      const q = (st.ui.clQ || '').trim().toLowerCase();
      const rows = base.filter((c) => !q || [c.name, c.phone].some((x) => String(x || '').toLowerCase().includes(q)));
      const dup = base.filter((c) => c.dup);
      const team = P.ctx(st).team;
      return `
      ${dup.length && st.role !== 'master' && !q ? `<section class="cell mb12"><div class="row between wrap"><div><div class="t-section">Похоже, это один человек</div><div class="t-hint mt8">«Элина Круминя» записана дважды с одним номером, набранным по-разному. Объединение сохранит заметки обеих карточек.</div></div>${btn('Объединить в «Элина Круминя»', { size: 'sm', variant: 'secondary', action: 'toast', args: { msg: 'Карточки объединены' } })}</div></section>` : ''}
      <section class="cell">
        <div class="row wrap mb16"><div class="input-wrap" style="flex:1;min-width:220px">${icon('search', 'lead')}${P.liveInput('clQ', { placeholder: 'Поиск по имени или телефону', cls: 'inline' })}</div>${P.select([['last', 'по последнему визиту'], ['name', 'по имени'], ['visits', 'по числу визитов']], 'last', { cls: 'inline', attrs: ' style="width:auto;height:36px;font-size:13.5px;background-position:calc(100% - 16px) 15px,calc(100% - 11px) 15px"' })}</div>
        <div class="row between wrap mb12"><div class="chips scroll">${[['Все', rows.length], ['Любимые', rows.filter((x) => x.flag === 'fav').length], ['Осторожно', rows.filter((x) => x.flag === 'attention').length], ['Новые за месяц', rows.filter((x) => x.visits <= 1).length]].map(([f, n], i) => `<button type="button" class="chip xs ${i === 0 ? 'on' : ''}">${f} <span class="n">${n}</span></button>`).join('')}</div><span class="t-meta">${P.countOf(rows.length, ['клиент', 'клиента', 'клиентов'])}</span></div>
        <div class="table-wrap"><table class="table responsive">
          <thead><tr><th>Клиент</th><th>Телефон</th>${team ? '<th>Ходит к</th>' : ''}<th>Последний визит</th><th class="r">Визитов</th><th>Ближайшая</th><th>Метки</th></tr></thead>
          <tbody>${rows.map((c) => { const m = P.memberOf(c.member); const up = P.upcomingOf(st, c); return `<tr class="click"${act('nav', { name: 'client', id: c.id })}>
            <td><div class="cellname">${avatar(c, 'sm')}<div><b>${esc(c.name)}${c.dup ? ' <span class="tag-dup">дубль</span>' : ''}</b><small class="num m-only">${esc(c.phone)} · визитов: ${c.visits}${c.lastVisit ? `, последний ${c.lastVisit}` : ''}</small></div></div></td>
            <td class="hide-m num">${esc(c.phone)}</td>
            ${team ? `<td class="hide-m">${m ? `<i class="member-dot" style="--ev:var(--${m.tone})"></i>${esc(m.short)}` : '<span class="muted">—</span>'}</td>` : ''}
            <td class="hide-m">${c.lastVisit || '<span class="muted">не было</span>'}</td>
            <td class="r num hide-m">${c.visits}</td>
            <td class="hide-m">${up || '<span class="muted">—</span>'}</td>
            <td class="m-right">${c.flag === 'fav' ? status('fav', 'Любимый') : c.flag === 'attention' ? status('warn', 'Осторожно') : ''}</td>
          </tr>`; }).join('')}</tbody>
        </table></div>
        <div class="pager"><span>${q ? `найдено ${P.countOf(rows.length, ['клиент', 'клиента', 'клиентов'])}` : `все ${P.countOf(rows.length, ['клиент', 'клиента', 'клиентов'])}`}</span></div>
      </section>`;
    },
  };

  P.SCREENS.client = {
    title: (st) => P.clientOf(st.route.id).name, hint: (st) => `Клиент с ${P.clientOf(st.route.id).since}`, back: 'clients', crumb: 'Клиенты',
    actions: (st) => btn('', { variant: 'ghost', icon: 'more', title: 'Ещё', action: 'menuAt', args: { name: 'clientMore', id: st.route.id } }) + btn('Новая запись', { variant: 'primary', icon: 'plus', action: 'sheet', args: { name: 'newBooking', clientId: st.route.id } }),
    render(st) {
      const c = P.clientOf(st.route.id);
      const upcoming = P.ctx(st).bookings.filter((b) => b.client === c.id && b.status !== 'cancelled' && b.start > NOW()).sort((a, b) => a.start - b.start);
      const visits = upcoming;
      return `
      <div class="grid c12 top">
        <section class="cell span-4">
          <div class="row" style="gap:14px;align-items:flex-start">${avatar(c, 'xl')}<div style="min-width:0"><div class="t-title">${esc(c.name)}</div><div class="t-meta mt8">Клиент с ${c.since}</div><div class="row mt12">${c.flag === 'fav' ? status('fav', 'Любимый клиент') : c.flag === 'attention' ? status('warn', 'Осторожно') : `<span class="t-meta">Метки нет</span>`}</div></div></div>
          <dl class="kv mt20"><dt>Телефон</dt><dd class="num">${esc(c.phone)}</dd><dt>Почта</dt><dd>${c.email || '<span class="muted">не указана</span>'}</dd><dt>Чаще всего</dt><dd>${c.fav || '<span class="muted">ещё нет данных</span>'}</dd></dl>
          <div class="contact-acts mt20">${btn('Позвонить', { size: 'sm', variant: 'secondary', icon: 'phone', action: 'toast', args: { msg: 'Открыли бы звонок' } })}${btn('WhatsApp', { size: 'sm', variant: 'secondary', icon: 'msg', action: 'toast', args: { msg: 'Открыли бы WhatsApp' } })}${btn('SMS', { size: 'sm', variant: 'secondary', icon: 'msg', action: 'toast', args: { msg: 'Открыли бы SMS' } })}</div>
        </section>
        <div class="span-8 grid c3 keep-halves">
          <section class="cell"><div class="stat"><div class="k">Завершено визитов</div><div class="v">${c.visits}</div><div class="d">последний ${c.lastVisit || '—'}</div></div></section>
          <section class="cell lilac"><div class="stat"><div class="k">Потрачено</div><div class="v money">${eur(c.spent)}</div><div class="d">только завершённые визиты</div></div></section>
          <section class="cell"><div class="stat"><div class="k">Отменено</div><div class="v">${c.cancelled}</div><div class="d">неявок: ${c.noShow}</div></div></section>
          <section class="cell span-12" style="grid-column:1/-1">
            ${cellHead('Заметка', 'Метку и заметку видите только вы', { label: 'Изменить', action: 'sheet', args: { name: 'clientForm', id: c.id } })}
            <div class="t-body">${c.notes ? esc(c.notes) : '<span class="muted">Заметки нет. Здесь удобно хранить то, что не спросишь дважды.</span>'}</div>
          </section>
        </div>
        <section class="cell ${upcoming.length ? 'rose' : ''} span-12">
          ${cellHead('Ближайшая запись', upcoming.length ? 'Можно перенести или отменить' : 'Ближайших записей нет — запишите клиента сами', upcoming.length ? { label: 'Перенести', action: 'sheet', args: { name: 'reschedule', id: upcoming[0].id } } : { label: 'Новая запись', action: 'sheet', args: { name: 'newBooking', clientId: c.id } })}
          ${upcoming.slice(0, 1).map((b) => `<div style="background:var(--cell);color:var(--ink);border-radius:12px;padding:4px 12px">${P.visitRow(b, { member: st.caps.hasTeam })}</div>`).join('')}
        </section>
        <section class="cell span-12">
          ${cellHead('Последние визиты', `всего ${P.countOf(c.visits + c.cancelled, ['запись', 'записи', 'записей'])}, показаны 6 последних`)}
          <div class="table-wrap"><table class="table responsive">
            <thead><tr><th>Дата</th><th>Время</th><th>Услуга</th><th>Длительность</th><th class="r">Цена</th><th>Статус</th></tr></thead>
            <tbody>${[['12 сен', '14:30', 'Маникюр с покрытием гель-лак', 90, 45, 'confirmed'], ['29 авг', '15:00', 'Маникюр с покрытием гель-лак', 90, 45, 'completed'], ['8 авг', '11:00', 'Педикюр с покрытием', 75, 48, 'completed'], ['18 июл', '16:30', 'Маникюр с покрытием гель-лак', 90, 45, 'completed'], ['27 июн', '12:00', 'Снятие покрытия', 20, 8, 'cancelled'], ['6 июн', '14:00', 'Маникюр с покрытием гель-лак', 90, 45, 'completed']].map(([d, t, s, m, p, s2]) => `<tr class="click"${act('openBooking', { id: 'b6' })}><td><b style="font-weight:500">${d}</b></td><td class="hide-m num">${t}</td><td>${s}<small class="muted m-only" style="display:block">${t} · ${fmtDur(m)}</small></td><td class="hide-m num">${fmtDur(m)}</td><td class="r num">${eur(p)}</td><td class="hide-m">${status(s2)}</td></tr>`).join('')}</tbody>
          </table></div>
        </section>
      </div>`;
    },
  };

  /* ============================================================ УСЛУГИ */
  P.SCREENS.services = {
    title: 'Услуги', hint: 'Что вы делаете и сколько это стоит',
    actions: (st) => st.caps.canManageServices ? btn('Категория', { variant: 'secondary', icon: 'plus', action: 'sheet', args: { name: 'categoryForm' } }) + btn('Услуга', { variant: 'primary', icon: 'plus', action: 'sheet', args: { name: 'serviceForm' } }) : '',
    render(st) {
      const c = P.ctx(st);
      const tab = st.ui.svcTab || 'list';
      const cats = st.role === 'solo' ? P.CATEGORIES.filter((x) => x.id === 'c-nails') : P.CATEGORIES.filter((x) => c.services.some((s) => s.cat === x.id));
      const ro = !st.caps.canManageServices;
      let body = '';
      if (tab === 'list') body = `<section class="cell">
          ${ro ? '<div class="t-hint mb16" style="padding:10px 14px;border-radius:12px;background:var(--sunken)">Прайс ведёт владелица или администратор. Здесь — что вы можете записать клиенту.</div>' : ''}
          <div class="t-meta mb8">услуг: ${c.services.length} · видно клиентам ${c.services.filter((s) => s.visible).length}</div>
          ${cats.map((cat) => `<div class="cat-head">${esc(cat.name)} <span class="n">${c.services.filter((s) => s.cat === cat.id).length}</span></div>
            ${c.services.filter((s) => s.cat === cat.id).map((s) => `<div class="svc-row"><i class="bar" style="--c:${s.color || (P.CATEGORIES.find((x) => x.id === s.cat) || {}).color || 'var(--line-2)'}"></i>
              <div style="min-width:0"><b>${esc(s.name)}${!s.visible ? ' <span class="status plain" style="margin-left:6px">Скрыта</span>' : ''}</b><small>${fmtDur(s.duration)}${s.buffer ? ` + ${s.buffer} мин на уборку` : ''}${c.team ? ` · ${s.performers.map((p) => P.memberOf(p).short).join(', ')}` : ''}</small></div>
              <span class="dur num">${fmtDur(s.duration)}</span><span class="price num">${eur(s.price)}</span>
              ${ro ? '<span></span>' : btn('', { size: 'sm', variant: 'ghost', icon: 'more', title: 'Действия', action: 'menuAt', args: { name: 'serviceRow', id: s.id } })}
            </div>`).join('')}`).join('')}
        </section>`;
      else if (tab === 'categories') body = `<section class="cell">
          <div class="t-hint mb16">Категории группируют услуги на странице записи. Клиент видит разделы в этом порядке.</div>
          <div class="list">${cats.map((cat, i) => `<div class="list-row" style="grid-template-columns:auto 14px 1fr auto auto">${icon('drag', 'muted')}<i style="width:14px;height:14px;border-radius:50%;background:${cat.color || 'var(--line-2)'}"></i><div><div class="main-line">${esc(cat.name)}</div><div class="sub-line">${c.services.filter((s) => s.cat === cat.id).length} ${plural(c.services.filter((s) => s.cat === cat.id).length, ['услуга', 'услуги', 'услуг'])}</div></div><div class="row" style="gap:2px">${btn('', { size: 'xs', variant: 'ghost', icon: 'chevD', title: 'Ниже' })}${btn('', { size: 'xs', variant: 'ghost', icon: 'edit', title: 'Изменить', action: 'sheet', args: { name: 'categoryForm', id: cat.id } })}</div>${P.switch_(cat.visible, 'toast', { msg: `Категория «${cat.name}» ${cat.visible ? 'скрыта' : 'показана'}` })}</div>`).join('')}</div>
        </section>`;
      else body = `<div class="grid c12 showcase">
          <section class="cell span-7 preview-pane" style="display:grid;place-items:center;background:var(--sunken);box-shadow:none">${preview(st, c)}</section>
          <section class="cell span-5">${cellHead('Как показывать', 'Так это выглядит у клиента на странице записи')}
            ${P.switchRow('Показывать цены', 'Выключите, чтобы показать услуги без цен', true, 'toast', { msg: 'Сохранено' })}${P.switchRow('Показывать длительность', '', true, 'toast', { msg: 'Сохранено' })}${P.switchRow('Группировать по категориям', 'Выключите — клиент увидит один общий список', true, 'toast', { msg: 'Сохранено' })}
            <div class="cat-head mt16">Что видно клиенту <span class="n">${c.services.filter((s) => s.visible).length} из ${c.services.length}</span></div>
            <div class="list">${c.services.map((s) => `<div class="list-row" style="grid-template-columns:1fr auto;padding:9px 0"><div><div class="main-line" style="font-weight:400">${esc(s.name)}</div></div>${P.switch_(s.visible, 'toast', { msg: `«${s.name}» ${s.visible ? 'скрыта у клиентов' : 'показана клиентам'}` })}</div>`).join('')}</div>
          </section>
        </div>`;
      const caption = { list: 'Порядок и цены, как в вашем прайсе', categories: 'Разделы, которыми сгруппированы услуги', showcase: 'Так это видят клиенты на странице «Цены»' }[tab];
      return `<div class="row between wrap mb16">${P.seg([['list', 'Список'], ['categories', 'Категории'], ['showcase', 'Предпросмотр']], tab, 'svcTab')}<span class="t-meta">${caption}</span></div>${body}`;
    },
  };

  const preview = (st, c, o = {}) => {
    const cats = P.CATEGORIES.filter((x) => c.services.some((s) => s.cat === x.id && s.visible));
    const name = st.role === 'solo' ? 'Neve Nails' : 'Lumen Studio';
    return `<div class="preview-frame ${o.desktop ? 'desktop' : ''}"><div class="pv ${o.dark ? 'dark' : ''}" style="${o.style || ''}">
      <div class="hero"><div class="ph"></div><div><b>${name}</b><small>${st.role === 'solo' ? 'Ногтевой сервис · Рига, Центр' : 'Салон красоты · Рига, ул. Тербатас 14'}</small></div></div>
      <h4>Ближайшее свободное окно</h4><div class="slots"><span class="on">сегодня 16:00</span><span>17:00</span><span>пн 10:00</span><span>пн 11:30</span></div>
      ${cats.map((cat) => `<h4>${esc(cat.name)}</h4>${c.services.filter((s) => s.cat === cat.id && s.visible).map((s) => `<div class="svc"><span>${esc(s.name)}</span><span class="num">${fmtDur(s.duration)} · ${eur(s.price)}</span></div>`).join('')}`).join('')}
      <div class="cta">Записаться</div>
    </div></div>`;
  };
  P.preview = preview;

  /* ============================================================ КОМАНДА */
  P.SCREENS.team = {
    title: 'Команда', hint: 'Кто работает и что каждому доступно',
    actions: () => btn('Пригласить', { variant: 'primary', icon: 'plus', action: 'sheet', args: { name: 'invite' } }),
    render(st) {
      const active = P.MEMBERS.filter((m) => !m.invited), invited = P.MEMBERS.filter((m) => m.invited);
      return `
      <div class="team-grid">${active.map((m) => { const now = NOW(); const pct = (t) => `${(((t - 480) / 780) * 100).toFixed(1)}%`; const mb = P.BOOKINGS.filter((b) => b.member === m.id), ms = P.SLOTS.filter((s) => s.member === m.id); return `<button type="button" class="member-card tone-${m.tone}"${act('nav', { name: 'member', id: m.id })}>${avatar(m, 'lg')}<div class="txt"><b>${esc(m.name)}</b><span>${esc(m.trade)}</span></div><div class="load"><b>${m.todayCount}</b><br>${P.plur(m.todayCount, ['запись', 'записи', 'записей'])} сегодня</div><div class="mini-rail"><div class="mini">${mb.map((b) => `<i class="${b.status === 'completed' ? 'done' : ''}" style="left:${pct(b.start)};width:calc(${pct(b.end)} - ${pct(b.start)})"></i>`).join('')}${ms.map((s) => `<i class="free" style="left:${pct(s.start)};width:calc(${pct(s.end)} - ${pct(s.start)})"></i>`).join('')}${m.role !== 'admin' ? `<i class="now" style="left:${pct(now)}"></i>` : ''}</div><div class="t-meta mt8" style="font-size:11.5px">${m.role === 'admin' ? 'без записей — ресепшен' : `${mb.length ? `с ${fmtTime(Math.min(...mb.map((b) => b.start)))} до ${fmtTime(Math.max(...mb.map((b) => b.end)))}` : 'сегодня свободна'} · окон ${ms.length}`}</div></div></button>`; }).join('')}</div>
      ${invited.length ? `<section class="cell mt12">${cellHead('Ждут ответа', 'Приглашение действует семь дней')}<div class="list">${invited.map((m) => `<div class="list-row invite-row">${avatar(m)}<div><div class="main-line">${esc(m.email)}</div><div class="sub-line">Мастер · приглашение отправлено ${m.invitedAt}</div></div><div class="row">${btn('Скопировать ссылку', { size: 'xs', variant: 'ghost', icon: 'copy', action: 'toast', args: { msg: 'Скопировано' } })}${btn('Отозвать', { size: 'xs', variant: 'ghost', action: 'dialog', args: { name: 'revokeInvite' } })}</div></div>`).join('')}</div></section>` : ''}
      <section class="cell mt12">${cellHead('Загрузка на неделе', 'Занятые часы по мастерам, 7–13 сентября')}${P.hbars([{ name: 'Анна', v: 31, tone: 'm1' }, { name: 'Давис', v: 26, tone: 'm5' }, { name: 'Марта', v: 18, tone: 'm2' }, { name: 'Лиене', v: 14, tone: 'm3' }], { fmt: (v) => `${v}\u00A0ч` })}</section>`;
    },
  };

  P.SCREENS.member = {
    title: (st) => P.memberOf(st.route.id).name, hint: (st) => P.memberOf(st.route.id).trade, back: 'team', crumb: 'Команда',
    actions: (st) => btn('', { variant: 'ghost', icon: 'more', title: 'Ещё', action: 'menuAt', args: { name: 'memberMore', id: st.route.id } }) + btn('Открыть расписание', { variant: 'primary', icon: 'calendar', action: 'nav', args: { name: 'calendar', view: 'day', member: st.route.id } }),
    render(st) {
      const m = P.memberOf(st.route.id);
      const svc = P.SERVICES;
      return `
      <div class="grid c12 top">
        <section class="cell span-4">
          <div class="row" style="gap:14px;align-items:flex-start">${avatar(m, 'xl')}<div><div class="t-title">${esc(m.name)}</div><div class="t-meta mt8">${esc(m.trade)}</div><div class="mt8"><span class="role-tag ${m.role}">${{ owner: 'Владелец', admin: 'Администратор', master: 'Мастер' }[m.role]}</span></div></div></div>
          <dl class="kv mt20"><dt>Телефон</dt><dd class="num">${esc(m.phone)}</dd><dt>Почта</dt><dd>${esc(m.email)}</dd><dt>В команде с</dt><dd>${m.joined}</dd></dl>
          <div class="mt20">${cellHead('Фото', 'Клиенты видят его рядом с именем на странице записи')}<div class="row">${btn('Загрузить фото', { size: 'sm', variant: 'secondary', icon: 'camera' })}</div></div>
        </section>
        <div class="span-8 stack">
          <div class="grid c3 keep-halves">
            <section class="cell"><div class="stat"><div class="k">Записей сегодня</div><div class="v">${m.todayCount}</div></div></section>
            <section class="cell"><div class="stat"><div class="k">Будущих визитов</div><div class="v">${m.upcoming}</div></div></section>
            <section class="cell lilac"><div class="stat"><div class="k">Доход за месяц</div><div class="v money">${eur((P.FINANCE.byMember.find((x) => x.id === m.id) || { v: 0 }).v)}</div></div></section>
          </div>
          <section class="cell">
            ${cellHead('Услуги', 'Что человек оказывает. Свою цену и длительность задают в карточке услуги.')}
            <div class="list">${svc.map((s) => `<div class="list-row" style="grid-template-columns:1fr auto auto;padding:9px 0"><div><div class="main-line" style="font-weight:400">${esc(s.name)}</div><div class="sub-line">${fmtDur(s.duration)} · ${eur(s.price)}</div></div>${m.services.includes(s.id) && s.id === 's-cut-w' ? '<span class="t-meta">своя цена 30 €</span>' : '<span></span>'}${P.switch_(m.services.includes(s.id), 'toast', { msg: 'Услуги сохранены' })}</div>`).join('')}</div>
          </section>
          ${st.caps.canManagePayouts && m.role === 'master' ? `<section class="cell">${cellHead('Условия расчёта', 'Новые условия действуют с даты и не меняют утверждённые ведомости', { label: 'Изменить', action: 'sheet', args: { name: 'compensation', id: m.id } })}<div class="row wrap"><span class="chip">${m.id === 'davis' ? 'аренда 400 € в месяц' : '50% от дохода'}</span><span class="t-meta">действуют с 1 июля 2026</span></div></section>` : ''}
          <section class="cell">
            ${cellHead('Доступ', m.role === 'owner' ? 'Роль владельца здесь не меняется: это передача заведения, а не настройка.' : 'Что человеку доступно в кабинете')}
            ${m.role !== 'owner' ? `<div class="radio-cards">${[['admin', 'Администратор', 'Календарь, записи, клиенты, услуги, страница и команда. Без настроек заведения и ведомости выплат.'], ['master', 'Мастер', 'Свой день и общая адресная книга. Без прайса, команды и страницы.']].map(([r, t, d]) => `<button type="button" class="radio-card ${m.role === r ? 'on' : ''}"${act('toast', { msg: 'Роль изменена' })}><i></i><div><b>${t}</b><span>${d}</span></div></button>`).join('')}</div>` : ''}
          </section>
        </div>
      </div>`;
    },
  };

  /* ============================================================ ФИНАНСЫ */
  P.SCREENS.finance = {
    title: 'Финансы', hint: 'Сколько заработано',
    actions: () => btn('Скачать CSV', { variant: 'ghost', icon: 'download', action: 'toast', args: { msg: 'Файл finance-2026-09.csv скачивается' } }),
    render(st) {
      const solo = st.role === 'solo';
      const F = solo ? P.SOLO_FINANCE : P.FINANCE;
      const f = solo ? P.SOLO_FINANCE : P.FINANCE.month;
      const delta = Math.round(((f.total - f.prev) / f.prev) * 100);
      const period = st.ui.period || 'month';
      return `
      <div class="row between wrap mb16">${P.seg([['month', 'Месяц'], ['quarter', '3 месяца'], ['year', 'Год'], ['all', 'Всё время']], period, 'period')}<span class="t-meta">Завершённые записи по цене на момент записи</span></div>
      <div class="grid c12">
        <section class="cell lilac span-6"><div class="stat big"><div class="k">Доход · сентябрь</div><div class="v money">${eur(f.total)}</div><div class="d ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : '−'}${Math.abs(delta)}% к прошлому периоду · ${f.visits} ${plural(f.visits, ['визит', 'визита', 'визитов'])}</div></div><div class="mt20">${P.bars((solo ? P.SOLO_FINANCE.byMonth : P.FINANCE.byMonth.slice(-6)), { label: 'Доход по месяцам', scale: false })}</div><div class="mt16 heat-block"><div class="heat" role="img" aria-label="Доход по дням сентября">${Array.from({ length: 30 }, (_, i) => { const d = i + 1; const off = d % 7 === 6 || d % 7 === 0 && d !== 12; const v = off ? 0 : 40 + ((d * 37) % 60); return `<i class="${d === 12 ? 'on' : ''} ${d > 12 ? 'off' : ''}" style="height:${d > 12 ? 3 : v}%" title="${d} сентября"></i>`; }).join('')}</div><div class="heat-cap"><span>1 сен</span><span>сегодня, 12</span><span>30 сен</span></div></div></section>
        <div class="span-6 grid c2">
          <section class="cell"><div class="stat"><div class="k">Средний чек</div><div class="v money">${eur(f.avg)}</div><div class="d">за визит</div></div></section>
          <section class="cell"><div class="stat"><div class="k">Отмены</div><div class="v">${f.cancelled + f.noShow}</div><div class="d">${f.cancelled} ${plural(f.cancelled, ['отмена', 'отмены', 'отмен'])} и ${f.noShow} не ${f.noShow === 1 ? 'пришёл' : 'пришли'} из ${f.visits}</div></div></section>
          <section class="cell" style="grid-column:1/-1">${cellHead('Услуги по доходу', 'сентябрь')}${P.hbars((solo ? P.SOLO_FINANCE.byService : P.FINANCE.byService).slice(0, 5))}</section>
        </div>
        ${st.caps.hasTeam ? `<section class="cell span-6">${cellHead('Мастера по доходу', 'сентябрь', st.caps.canManagePayouts ? { label: 'Выплаты', action: 'nav', args: { name: 'payouts' } } : null)}<div class="table-wrap"><table class="table dense responsive"><thead><tr><th>Мастер</th><th class="r">Визиты</th><th class="r">Средний чек</th><th class="r">Доход</th><th class="r">Доля</th></tr></thead><tbody>${P.FINANCE.byMember.map((r) => { const m = P.memberOf(r.id); return `<tr class="click"${act('nav', { name: 'member', id: r.id })}><td><div class="cellname">${avatar(m, 'sm')}<div><b>${esc(m.short)}</b><small class="m-only num">${r.n} ${plural(r.n, ['визит', 'визита', 'визитов'])} · ${Math.round((r.v / P.FINANCE.month.total) * 100)}%</small></div></div></td><td class="r num hide-m">${r.n}</td><td class="r num hide-m">${eur(r.avg)}</td><td class="r num"><b style="font-weight:500">${eur(r.v)}</b></td><td class="r num muted hide-m">${Math.round((r.v / P.FINANCE.month.total) * 100)}%</td></tr>`; }).join('')}</tbody></table></div></section>` : ''}
        <section class="cell ${st.caps.hasTeam ? 'span-6' : 'span-12'}">${cellHead('Завершённые записи', `из чего сложились ${eur(f.total)} · новые первыми`)}<div class="table-wrap"><table class="table dense responsive"><thead><tr><th>Когда</th><th>Клиент</th><th>Услуга</th>${st.caps.hasTeam ? '<th>Мастер</th>' : ''}<th class="r">Сумма</th></tr></thead><tbody>${(solo ? P.SOLO_FINANCE.completed : P.FINANCE.completed).map((r) => `<tr><td class="num"><b style="font-weight:500">${r.d}</b> <span class="muted">${r.t}</span><small class="m-only muted" style="display:block">${esc(r.client)}</small></td><td class="hide-m">${esc(r.client)}</td><td class="hide-m">${esc(r.svc)}</td>${st.caps.hasTeam ? `<td class="hide-m">${esc(P.memberOf(r.member).short)}</td>` : ''}<td class="r num">${eur(r.v)}</td></tr>`).join('')}</tbody></table></div><div class="pager"><span>показаны 7 последних из ${P.countOf(f.visits, ['визита', 'визитов', 'визитов'])}</span>${btn(`Показать ещё ${Math.min(25, f.visits - 7)}`, { size: 'sm', variant: 'ghost' })}</div></section>
      </div>
      <p class="t-meta mt16" style="max-width:70ch">Считается по ценам на момент записи для визитов со статусом «Завершена». Это не бухгалтерский учёт: оплаты в продукте не проводятся, суммы отражают назначенную стоимость, а не фактически полученные деньги.</p>`;
    },
  };

  /* ============================================================ ВЫПЛАТЫ / ЗАРАБОТОК */
  P.SCREENS.payouts = {
    title: (st) => (st.role === 'master' ? 'Заработок' : 'Выплаты'), hint: (st) => (st.role === 'master' ? 'Ваши утверждённые выплаты и условия расчёта' : 'Кому сколько за месяц — по условиям расчёта и завершённым визитам'), back: (st) => (st.role === 'master' ? null : 'finance'), crumb: 'Финансы',
    actions: (st) => (st.role === 'master' ? '' : btn('Рассчитать август', { variant: 'primary', icon: 'refresh', action: 'toast', args: { msg: 'Ведомости пересчитаны. Утверждённые не менялись: 2' } })),
    render(st) {
      const own = st.role === 'master';
      const rows = own ? P.PAYOUTS.filter((p) => p.member === 'anna' && p.status !== 'draft') : P.PAYOUTS;
      return `
      <div class="row between wrap mb16"><div class="row">${btn('', { size: 'sm', variant: 'ghost', icon: 'chevL', title: 'Предыдущий месяц' })}<span class="t-title" style="font-size:22px">Август 2026</span>${btn('', { size: 'sm', variant: 'ghost', icon: 'chevR', title: 'Следующий месяц' })}</div><span class="t-meta">Считается по ценам завершённых визитов. Платежи продукт не проводит.</span></div>
      <div class="grid c12">
        ${own ? `<section class="cell lilac span-4"><div class="stat"><div class="k">К выплате за август</div><div class="v money">${eur(1130)}</div><div class="d">52 визита · доход 2 260 €</div></div></section>
        <section class="cell span-8">${cellHead('Условия расчёта', 'действуют с 1 июля 2026')}<div class="row wrap"><span class="chip">50% от дохода</span><span class="t-meta">Условия задаёт владелица. Новые условия действуют с даты и не меняют утверждённые ведомости.</span></div></section>` : ''}
        <section class="cell span-12">
          ${cellHead(own ? 'Ведомости' : 'Ведомости за август', own ? 'Утверждённые и выплаченные' : 'Утверждённые и выплаченные ведомости пересчёт не меняет: 2')}
          <div class="table-wrap"><table class="table responsive"><thead><tr>${own ? '' : '<th>Мастер</th>'}<th>Период</th><th class="r">Визиты</th><th class="r">Доход</th><th class="r">Мастеру</th><th class="r">Салону</th><th>Статус</th>${own ? '' : '<th></th>'}</tr></thead>
          <tbody>${rows.map((p) => { const m = P.memberOf(p.member); return `<tr>${own ? '' : `<td><div class="cellname">${avatar(m, 'sm')}<div><b>${esc(m.short)}</b><small class="hide-m">${esc(p.terms)}</small><small class="m-only">${p.period} · ${esc(p.terms)}</small></div></div></td>`}<td class="hide-m">${p.period}</td><td class="hide-m r num">${p.visits}</td><td class="hide-m r num">${eur(p.revenue)}</td><td class="r num"><b style="font-weight:500">${eur(p.toMaster)}</b></td><td class="hide-m r num">${eur(p.toSalon)}</td><td class="m-status">${status(p.status)}</td>${own ? '' : `<td class="r m-acts"><div class="row" style="justify-content:flex-end;gap:4px">${p.status === 'draft' ? btn('Утвердить', { size: 'xs', variant: 'secondary', icon: 'check', action: 'toast', args: { msg: 'Ведомость утверждена' } }) : p.status === 'approved' ? btn('Выплачено', { size: 'xs', variant: 'secondary', action: 'toast', args: { msg: 'Отмечено как выплаченное' } }) : ''}${btn('', { size: 'xs', variant: 'ghost', icon: 'more', title: 'Действия с ведомостью', action: 'menuAt', args: { name: 'payoutRow' } })}</div></td>`}</tr>`; }).join('')}</tbody></table></div>
        </section>
      </div>`;
    },
  };

  /* ============================================================ СТРАНИЦА */
  P.SCREENS.page = {
    title: 'Страница', hint: 'То, что видят клиенты по вашей ссылке',
    actions: (st) => btn('Открыть страницу', { variant: 'ghost', icon: 'external', action: 'toast', args: { msg: 'Открыли бы страницу в новой вкладке' } }) + btn('Открыть Студию', { variant: 'secondary', icon: 'wand', action: 'nav', args: { name: 'studio' } }),
    render(st) {
      const c = P.ctx(st);
      const tab = st.ui.pageTab || 'content';
      let left = '';
      if (tab === 'content') left = `
        <section class="cell">${cellHead('Адрес страницы', 'Это ссылка, которую вы даёте клиентам. Прежняя продолжит работать.')}<div class="input-wrap"><span class="prefix">amolie.com/</span>${P.input({ value: P.orgOf(st).slug })}<span class="suffix" style="color:var(--ok)">${icon('check')}</span></div><div class="row mt12">${btn('Занять адрес', { size: 'sm', variant: 'secondary', disabled: true })}<span class="t-meta">Это ваш текущий адрес</span></div></section>
        <section class="cell">${cellHead('О мастере', '')}
          ${P.field('Отображаемое имя на странице', P.input({ value: P.orgOf(st).name }), 'Пусто — клиенты увидят «' + esc(c.me.name) + '».')}
          <div class="mt16">${P.field('Описание', P.textarea({ value: st.role === 'solo' ? 'Ногтевой сервис с 8-летним опытом. Гель-лак, укрепление, дизайн. Центр Риги, у Верманского парка.' : 'Салон в центре Риги: волосы, ногти, брови и ресницы. Пять мастеров, запись онлайн без звонков.', rows: 3 }), 'Два-три предложения. Клиент читает их перед тем, как записаться.')}</div>
          <div class="mt16">${P.field('Язык страницы для клиентов', P.select([['ru', 'Русский'], ['lv', 'Latviešu'], ['en', 'English']], 'ru'), 'Названия и описания услуг остаются как вы их написали — переводится только интерфейс.')}</div>
        </section>
        <section class="cell">${cellHead('Контакты для клиентов', 'Это видят на вашей странице. К входу в кабинет отношения не имеет.')}
          <div class="form-grid">${P.field('Город', P.input({ value: 'Рига' }))}${P.field('Телефон', P.input({ value: c.me.phone }))}${P.field('Адрес', P.input({ value: st.role === 'solo' ? 'ул. Элизабетес 45, 3 этаж' : 'ул. Тербатас 14, 2 этаж' }), '', { cls: 'full' })}${P.field('Instagram', P.input({ value: st.role === 'solo' ? '@neve.nails' : '@lumen.studio' }))}${P.field('Почта', P.input({ value: st.role === 'solo' ? 'hello@nevenails.lv' : 'hello@lumen.lv' }))}</div>
        </section>
        <section class="cell">${cellHead('Разделы на странице', '')}${P.switchRow('Показывать «Цены»', 'Прайс со всеми видимыми услугами', true, 'toast', { msg: 'Сохранено' })}${P.switchRow('Показывать «Контакты»', 'Город, адрес, телефон и Instagram', true, 'toast', { msg: 'Сохранено' })}${P.switchRow('Показывать фото мастера в шапке', '', true, 'toast', { msg: 'Сохранено' })}</section>
`;
      else if (tab === 'appearance') left = `
        <section class="cell">${cellHead('Фирменный стиль', 'Вся идентичность страницы разом: палитра, шрифтовая пара и поверхности')}<div class="worlds">${P.WORLDS.map((w, i) => `<button type="button" class="world ${i === 0 ? 'on' : ''}"${act('toast', { msg: `Стиль «${w.name}» примерен — опубликуйте в Студии` })}><div class="art" style="background:${w.bg};color:${w.ink}"><span style="font-family:var(--font-display);font-size:16px">Записаться</span></div><div class="cap"><b>${w.name}</b><span>${w.desc}</span></div></button>`).join('')}</div><div class="row mt16">${btn('Настроить в Студии', { variant: 'secondary', icon: 'wand', action: 'nav', args: { name: 'studio' } })}<span class="t-meta">Цвета, фото шапки, кнопки, движение — там, где видно результат сразу.</span></div></section>`;
      else left = `
        <section class="cell">${cellHead('Как принимать записи', 'Действует на все будущие записи')}
          ${P.switchRow('Подтверждать автоматически', 'Сейчас каждую новую запись подтверждаете вы. Пока не подтвердили, клиент ждёт ответа.', false, 'toast', { msg: 'Сохранено' })}
          ${P.switchRow('Клиент может отменить сам', 'Клиент отменяет сам за сутки до визита. Позже — только через вас.', true, 'toast', { msg: 'Сохранено' })}
          <div class="mt12">${P.field('За сколько до визита', P.seg([['2', '2 часа'], ['12', '12 часов'], ['24', 'сутки'], ['72', 'трое суток']], '24', 'noop', 'scroll'))}</div>
          ${P.switchRow('Клиент может перенести сам', 'В свободные окна нужной длины. Мастер получит уведомление.', true, 'toast', { msg: 'Сохранено' })}
        </section>
        <section class="cell">${cellHead('Уведомления клиенту', 'Что уходит письмом, если клиент оставил почту')}${P.switchRow('Подтверждение записи', '', true, 'toast', { msg: 'Сохранено' })}${P.switchRow('Напоминание за сутки', '', true, 'toast', { msg: 'Сохранено' })}${P.switchRow('Просьба об отзыве после визита', 'Пока не настроено', false, 'toast', { msg: 'Сохранено' })}</section>`;
      return `
      <div class="row between wrap mb16">${P.seg([['content', 'Содержание'], ['appearance', 'Оформление'], ['booking', 'Запись']], tab, 'pageTab')}<span class="row"><span class="status ok">Опубликована</span><span class="t-meta">· изменения 9 сентября</span></span></div>
      <div class="grid c12"><div class="span-7 stack">${left}</div><div class="span-5 page-preview"><div class="cell" style="background:var(--sunken);box-shadow:none;position:sticky;top:0"><div class="row between mb12"><span class="t-meta">Так страницу видит клиент</span>${P.seg([['m', 'Телефон'], ['d', 'Компьютер']], 'm', 'noop')}</div>${preview(st, c)}</div></div></div>
      <div class="save-bar"><span class="t-meta">Изменения не сохранены</span>${btn('Сохранить', { variant: 'primary', action: 'toast', args: { msg: 'Сохранено' } })}</div>`;
    },
  };

  /* ============================================================ НАСТРОЙКИ */
  P.SCREENS.settings = {
    title: 'Настройки', hint: 'Ваш вход и язык кабинета',
    render(st) {
      const c = P.ctx(st);
      const tab = st.ui.setTab || 'account';
      const tabs = [['account', 'Аккаунт'], ['alerts', 'Уведомления'], ...(st.caps.canManageWorkspace ? [['org', 'Заведение']] : [])];
      return `
      <div class="row between wrap mb16">${P.seg(tabs, tab, 'setTab')}</div>
      <div class="grid c12 set-${tab}">
        <div class="span-7 stack">
          ${tab !== 'account' ? '' : `<section class="cell">${cellHead('Аккаунт', 'Вход в кабинет и язык панели. Клиенты этого не видят.')}
            <div class="form-grid">${P.field('Имя', P.input({ value: c.me.name }))}${P.field('Телефон', P.input({ value: c.me.phone }), 'Запасной канал связи. Клиентам не показывается.')}${P.field('Email', P.input({ value: c.me.email }), '', { cls: 'full' })}${P.field('Язык кабинета', P.select([['ru', 'Русский'], ['lv', 'Latviešu'], ['en', 'English']], 'ru'), 'На каком языке вы работаете в панели. Клиентов не касается.')}${P.field('Часовой пояс', P.select([['riga', 'Рига (UTC+3)']], 'riga'))}</div>
          </section>`}
          ${tab !== 'alerts' ? '' : `<section class="cell">${cellHead('Уведомления о записях', 'Телефон покажет уведомление, как только клиент запишется. Настройка своя у каждого устройства.')}${P.switchRow('Уведомления о новых записях', 'Включены на этом устройстве', true, 'toast', { msg: 'Выключены на этом устройстве' })}${P.switchRow('Отмены клиентом', '', true, 'toast', { msg: 'Сохранено' })}<p class="t-meta mt12" style="max-width:60ch">Уведомление — быстрый способ узнать о записи, а не замена кабинету: телефон вправе задержать его. Сама запись всегда ждёт вас в «Сегодня».</p></section>`}
          ${tab !== 'account' ? '' : `<section class="cell">${cellHead('Пароль', '')}<div class="form-grid">${P.field('Текущий пароль', P.input({ type: 'password', value: '' }), '', { cls: 'full' })}${P.field('Новый пароль', P.input({ type: 'password' }), 'Не короче 8 символов')}${P.field('Повторите новый пароль', P.input({ type: 'password' }))}</div><div class="row mt16">${btn('Сменить пароль', { variant: 'secondary', action: 'toast', args: { msg: 'Пароль изменён' } })}</div></section>`}
          ${tab !== 'account' ? '' : `<section class="cell">${cellHead('Оформление кабинета', '')}${P.field('Тема', P.seg([['light', 'Светлая'], ['dark', 'Тёмная'], ['system', 'Как в системе']], st.theme, 'setTheme'))}</section>`}
        </div>
        <div class="span-5 stack">
          ${tab !== 'account' ? '' : `<section class="cell">${cellHead('Моё фото', 'Клиенты видят это фото рядом с именем на странице записи')}<div class="row" style="gap:16px">${avatar(c.me, 'xl')}<div class="stack" style="gap:6px">${btn('Загрузить фото', { size: 'sm', variant: 'secondary', icon: 'camera' })}<span class="t-meta">JPG, PNG или WebP · точка на снимке — что держать в центре круга</span></div></div></section>`}
          ${tab !== 'org' || !st.caps.canManageWorkspace ? '' : `<section class="cell">${cellHead('Заведение', 'Как работает и как называется')}<dl class="kv"><dt>Название</dt><dd>${P.orgOf(st).name}</dd><dt>Тип</dt><dd>${st.role === 'solo' ? 'Мастер работает одна' : 'Салон с командой · 5 человек'}</dd><dt>Тариф</dt><dd>${st.role === 'solo' ? 'Соло · 12 € / мес' : 'Салон · 39 € / мес'} <span class="muted">· продлится 3 октября</span></dd><dt>Валюта</dt><dd>EUR</dd></dl></section>`}
          ${tab !== 'org' || !st.caps.canManageWorkspace ? '' : `<section class="cell">${cellHead('Журнал действий', 'Кто и что менял в заведении', { label: 'Показать ещё', action: 'toast', args: { msg: 'В прототипе журнал короткий' } })}<div class="list">${(st.role === 'solo' ? P.SOLO_JOURNAL : P.JOURNAL).slice(0, 5).map((j) => `<div class="log-row"><span class="ts">${j.ts}</span><span><span class="who">${esc(j.who)}</span> <span class="what">${esc(j.what)}</span><br><span class="obj">${esc(j.obj)}</span></span><span></span></div>`).join('')}</div></section>`}
          ${tab !== 'account' ? '' : `<section class="cell">${cellHead('Выход', '')}${btn('Выйти из кабинета', { variant: 'ghost', icon: 'logout', action: 'dialog', args: { name: 'logout' } })}<p class="t-meta mt12">Чтобы вернуться, нужно будет снова ввести пароль.</p></section>`}
        </div>
      </div>
      <div class="save-bar"><span class="t-meta">Изменения не сохранены</span>${btn('Сохранить', { variant: 'primary', action: 'toast', args: { msg: 'Сохранено' } })}</div>`;
    },
  };

  /* ============================================================ ОНБОРДИНГ */
  const STEPS = [
    ['Адрес страницы', 'Придумайте ссылку, которую дадите клиентам', 'done'],
    ['Профиль', 'Фото, имя и пара слов о вашей работе', 'done'],
    ['Оформление', 'Выберите, как выглядит ваша страница', 'on'],
    ['Первая услуга', 'Без услуг клиенту нечего выбрать', ''],
    ['Свободное окно', 'Клиент видит только то время, что вы открыли', ''],
    ['Первая запись', 'Отправьте ссылку клиентам', ''],
  ];
  P.SCREENS.start = {
    title: 'Настройка страницы', full: true,
    render(st) {
      const cur = st.ui.step == null ? 2 : st.ui.step;
      const done = STEPS.filter((s, i) => i < cur).length;
      const panels = [
        () => `<h2 class="t-title">Выберите адрес страницы</h2><p class="t-hint" style="max-width:52ch">Сейчас адрес собран из вашего имени автоматически. Замените его на тот, который удобно продиктовать и написать в Instagram.</p><div class="input-wrap mt20"><span class="prefix">amolie.com/</span>${P.input({ value: P.orgOf(st).slug })}<span class="suffix" style="color:var(--ok)">${icon('check')}</span></div><div class="t-meta mt8">Адрес свободен · латинские буквы, цифры и дефис</div>`,
        () => `<h2 class="t-title">Расскажите о себе</h2><p class="t-hint" style="max-width:52ch">Это первое, что клиент видит на странице: фото, имя и несколько слов о том, что вы делаете.</p><div class="row mt20" style="gap:16px">${avatar(P.orgOf(st).me, 'xl')}${btn('Загрузить фото', { size: 'sm', variant: 'secondary', icon: 'camera' })}</div><div class="mt16">${P.field('Имя на странице', P.input({ value: P.orgOf(st).name }))}</div><div class="mt16">${P.field('О себе', P.textarea({ placeholder: 'Например: маникюр и уход за ногтями, 8 лет практики, центр города' }), 'Два-три предложения. Клиент читает их перед тем, как записаться.')}</div>`,
        () => `<h2 class="t-title">Оформите страницу</h2><p class="t-hint" style="max-width:52ch">У страницы уже есть аккуратный вид по умолчанию. Выберите стиль — цвета и шрифты можно уточнить в Студии.</p><div class="worlds mt20">${P.WORLDS.slice(0, 6).map((w, i) => `<button type="button" class="world ${(st.ui.obWorld || 'soft') === w.id ? 'on' : ''}"${act('obWorld', { value: w.id })}><div class="art" style="background:${w.bg};color:${w.ink}"><span style="font-family:var(--font-display);font-size:16px">Записаться</span></div><div class="cap"><b>${w.name}</b><span>${w.desc}</span></div></button>`).join('')}</div>`,
        () => `<h2 class="t-title">Добавьте первую услугу</h2><p class="t-hint" style="max-width:52ch">Название, длительность и цена — этого достаточно, чтобы клиент мог записаться. Фото, категории и дополнения добавите позже.</p><div class="mt20">${P.field('Название', P.input({ placeholder: 'Например: маникюр с покрытием', attrs: ' id="ob-service"' }), '', { error: st.ui.obError === 'service' ? 'Без названия услуга не появится на странице' : '' })}</div><div class="form-grid mt16">${P.field('Длительность, мин', P.input({ type: 'number', value: '60' }))}${P.field('Цена, €', P.input({ type: 'number', value: '35' }))}</div>`,
        () => `<h2 class="t-title">Откройте время для записи</h2><p class="t-hint" style="max-width:52ch">Расписание не строится по шаблону: вы открываете конкретные окна, и клиент выбирает из них. Опубликуйте первое.</p><div class="form-grid mt20">${P.field('Дата', P.pickField('date', 'ob-date', 'пн, 14 сентября'))}${P.field('Время', P.pickField('time', 'ob-time', '10:00'))}</div><div class="t-meta mt8">Открыть сразу неделю или месяц можно в календаре — «Опубликовать период».</div>`,
        () => `<h2 class="t-title">Страница готова — покажите её клиентам</h2><p class="t-hint" style="max-width:52ch">Отправьте ссылку в мессенджере, поставьте в Instagram или распечатайте QR-код ${st.role === 'solo' ? 'для рабочего места' : 'для салона'}. Этот шаг закроется сам, когда придёт первая запись.</p><div class="row mt20" style="gap:16px;align-items:flex-start">${P.qr()}<div class="stack" style="flex:1;gap:8px"><div class="link-box"><span class="grow">amolie.com/<b>${P.orgOf(st).slug}</b></span>${btn('', { size: 'xs', variant: 'ghost', icon: 'copy', title: 'Скопировать', action: 'toast', args: { msg: 'Скопировано' } })}</div><div class="row">${btn('Поделиться', { size: 'sm', variant: 'secondary', icon: 'share' })}${btn('Открыть страницу', { size: 'sm', variant: 'ghost', icon: 'external' })}</div></div></div>`,
      ];
      return `
      <div class="onb-shell">
        <div class="onb-bar">
          ${btn('Сохранить и выйти', { size: 'sm', variant: 'secondary', icon: 'arrowL', action: 'nav', args: { name: 'home' } })}
          <div class="ttl">Настройка страницы</div>
          <span class="spacer"></span>
          <span class="t-meta">Шаг ${cur + 1} из 6 · готово ${done}</span>
        </div>
        <div class="onb">
          <div class="onb-aside">
            <div class="onb-progress mb16"><i style="--p:${(done / 6).toFixed(3)}"></i></div>
            <div class="onb-steps">${STEPS.map(([t, h], i) => `<button type="button" class="onb-step ${i < cur ? 'done' : ''} ${i === cur ? 'on' : ''}"${act('step', { value: i })}><i>${i < cur ? icon('check') : i + 1}</i><div><b>${t}</b><span>${h}</span></div></button>`).join('')}</div>
          </div>
          <section class="cell onb-panel">
            <div class="onb-panel-body">${panels[cur]()}</div>
            <div class="onb-acts">${cur > 0 ? btn('Назад', { variant: 'ghost', action: 'step', args: { value: cur - 1 } }) : ''}<span class="grow"></span>${cur < 5 ? btn('Позже', { variant: 'ghost', action: 'step', args: { value: cur + 1, skip: true } }) : ''}${btn(cur < 5 ? 'Сохранить и продолжить' : 'Завершить настройку', { variant: 'primary', action: cur < 5 ? 'step' : 'nav', args: cur < 5 ? { value: cur + 1, require: cur === 3 ? 'service' : '' } : { name: 'home' } })}</div>
          </section>
        </div>
      </div>`;
    },
  };

  /* ============================================================ СТУДИЯ */
  P.SCREENS.studio = {
    title: 'Студия', full: true,
    render(st) {
      const c = P.ctx(st);
      const open = st.ui.studioSec || 'style';
      const ctx = st.ui.studioCtx || 'page';
      const sec = (id, title, val, body) => `<div class="acc ${open === id ? 'open' : ''}"><button type="button"${act('studioSec', { value: id })}>${title}<span>${val}</span>${icon('chevD')}</button><div class="body">${body}</div></div>`;
      return `<div class="studio">
        <div class="studio-bar">
          <div class="studio-bar-row">${btn('Выйти', { size: 'sm', variant: 'secondary', icon: 'arrowL', action: 'nav', args: { name: 'page' } })}<span class="status warn draft">Черновик</span><span class="spacer"></span>${btn('Опубликовать', { size: 'sm', variant: 'primary', action: 'sheet', args: { name: 'studioPublish' } })}</div>
          <div class="studio-bar-row tools">${btn('', { size: 'sm', variant: 'ghost', icon: 'undo', title: 'Отменить', action: 'toast', args: { msg: 'Отменено' } })}${btn('', { size: 'sm', variant: 'ghost', icon: 'redo', title: 'Повторить', action: 'toast', args: { msg: 'Повторено' } })}<span class="spacer"></span>${P.seg([['phone', 'Телефон'], ['desktop', 'Десктоп']], st.ui.studioDev || 'phone', 'studioDev')}<span class="spacer"></span>${btn('', { size: 'sm', variant: 'ghost', icon: 'eye', title: 'Показать опубликованное', action: 'toast', args: { msg: 'Показано опубликованное' } })}${btn('', { size: 'sm', variant: 'ghost', icon: 'history', title: 'История', action: 'sheet', args: { name: 'studioHistory' } })}</div>
        </div>
        <div class="studio-body ${st.ui.studioPanel ? 'panel-open' : ''}">
          <div class="studio-canvas">${preview(st, c, { desktop: st.ui.studioDev === 'desktop', dark: st.ui.studioWorld === 'poster', style: st.ui.studioWorld === 'aura' ? 'background:linear-gradient(160deg,#f6d6e4,#d9c9f0 60%,#e6f0f6)' : '' })}</div>
          <aside class="studio-side">
            <button type="button" class="studio-grip"${act('studioPanel')}><span class="handle"></span><b>Настройки</b><span class="t-meta">стиль: ${P.worldName(st.ui.studioWorld || 'soft')}</span>${icon('chevD')}</button>
            <div class="ctx">${P.seg([['page', 'Страница'], ['booking', 'Запись'], ['status', 'Статус']], ctx, 'studioCtx', 'block')}</div>
            ${ctx !== 'page' ? '' : sec('style', 'Стиль', P.worldName(st.ui.studioWorld || 'soft'), `<div class="worlds two">${P.WORLDS.map((w) => `<button type="button" class="world ${(st.ui.studioWorld || 'soft') === w.id ? 'on' : ''}"${act('studioWorld', { value: w.id })}><div class="art" style="background:${w.bg};color:${w.ink};height:56px"><span style="font-family:var(--font-display)">Записаться</span></div><div class="cap"><b>${w.name}</b></div></button>`).join('')}</div><div class="t-meta">У каждого стиля своя палитра и шрифты. Ниже можно поменять их под себя.</div>`)}
            ${ctx !== 'page' ? '' : sec('photos', 'Фотографии', 'шапка, портрет', `${P.field('Фото шапки', P.upload('JPG, PNG или WebP · 1600×900'))}${P.switchRow('Показывать фото мастера', 'PNG без фона встанет вырезкой', true)}${P.field('Что держать в центре', '<div class="t-meta">Перетащите точку по кадру — обрезка будет держать её.</div>')}`)}
            ${ctx !== 'page' ? '' : sec('background', 'Фон', 'как в стиле', P.seg([['style', 'Как в стиле'], ['color', 'Свой цвет'], ['image', 'Фотография']], 'style', 'noop', 'block'))}
            ${ctx !== 'page' ? '' : sec('buttons', 'Кнопки', 'как в стиле', `${P.field('Цвет кнопок', `<div class="swatches"><span class="swatch on" style="background:#E2568A"></span><span class="swatch" style="background:#684096"></span><span class="swatch" style="background:#1F1A1C"></span><span class="swatch" style="background:#2E7A58"></span><span class="swatch none"></span></div>`, 'Оттенок чуть углублён, чтобы текст читался')}${P.field('Заливка', P.seg([['solid', 'Заливка'], ['outline', 'Контур'], ['soft', 'Мягкая']], 'solid', 'noop', 'block'))}${P.field('Надпись', P.seg([['style', 'Как в стиле'], ['upper', 'ПРОПИСНЫМИ'], ['lower', 'строчными']], 'style', 'noop', 'block'))}`)}
            ${ctx !== 'page' ? '' : sec('text', 'Текст', 'Onest и Playfair', `${P.field('Цвет текста', P.seg([['style', 'Как в стиле'], ['own', 'Свой цвет']], 'style', 'noop', 'block'), 'Приглушённые оттенки подберутся сами.')}${P.field('Шрифтовая пара', P.select([['onest', 'Onest + Playfair — по умолчанию'], ['manrope', 'Manrope + Cormorant'], ['golos', 'Golos — один гротеск на всё']], 'onest'))}`)}
            ${ctx !== 'page' ? '' : sec('surfaces', 'Карточки и рамки', 'стекло', `${P.field('Материал', P.seg([['flat', 'Плоскость'], ['rule', 'Линейка'], ['shadow', 'Тень'], ['glass', 'Стекло']], 'glass', 'noop', 'block'))}${P.field('Вес контура', P.seg([['style', 'Как в стиле'], ['hair', 'Тоньше'], ['heavy', 'Жирнее']], 'style', 'noop', 'block'))}`)}
            ${ctx !== 'page' ? '' : sec('motion', 'Движение', 'живое', `<div class="radio-cards">${[['restrained', 'Сдержанное', 'Точность, сухость'], ['live', 'Живое', 'Авторская норма'], ['ceremonial', 'Торжественное', 'Церемония']].map(([v, t, d], i) => `<button type="button" class="radio-card ${i === 1 ? 'on' : ''}"><i></i><div><b>${t}</b><span>${d}</span></div></button>`).join('')}</div>${P.switchRow('Меньше движения', 'Так страницу видят клиенты с этой системной настройкой', false)}`)}
            ${ctx !== 'booking' ? '' : `${sec('bk-order', 'Порядок записи', 'услуга → время', `${P.field('Что клиент выбирает первым', P.seg([['svc', 'Услугу'], ['time', 'Время']], 'svc', 'noop', 'block'))}${P.switchRow('Показывать длительность', 'Рядом с ценой на странице', true)}${P.switchRow('Спрашивать телефон', 'Без телефона запись не принимается', true)}`)}${sec('bk-fields', 'Поля формы', 'имя, телефон', `${P.switchRow('Комментарий клиента', 'Свободное поле под запись', true)}${P.switchRow('Согласие на напоминания', 'Галочка в форме записи', false)}`)}`}
            ${ctx !== 'status' ? '' : `${sec('st-live', 'Что видно клиентам', 'страница открыта', `<div class="list"><div class="list-row" style="grid-template-columns:1fr auto"><div><div class="main-line">Страница</div><div class="sub-line">amolie.com/${esc(P.orgOf(st).slug)}</div></div>${status('ok', 'Открыта')}</div><div class="list-row" style="grid-template-columns:1fr auto"><div><div class="main-line">Онлайн-запись</div><div class="sub-line">Клиенты могут записываться</div></div>${status('ok', 'Включена')}</div><div class="list-row" style="grid-template-columns:1fr auto"><div><div class="main-line">Черновик оформления</div><div class="sub-line">Отличается от опубликованного</div></div>${status('warn', 'Не опубликован')}</div></div>`)}${sec('st-hist', 'Публикации', '№4 от 9 сентября', `${btn('История публикаций', { size: 'sm', variant: 'secondary', icon: 'history', action: 'sheet', args: { name: 'studioHistory' } })}`)}`}
            <div class="studio-side-foot">${btn('Вернуть настройки стиля', { size: 'sm', variant: 'ghost', icon: 'refresh', action: 'toast', args: { msg: 'Настройки стиля сброшены' } })}${btn('Вернуться к опубликованному', { size: 'sm', variant: 'ghost', action: 'dialog', args: { name: 'studioRevert' } })}</div>
          </aside>
        </div>
      </div>`;
    },
  };

  P.SCREENS.nosection = { title: 'Этого раздела в вашем кабинете нет', hint: '', render: () => `<div class="centered">${P.empty('Этого раздела в вашем кабинете нет', 'Ссылка ведёт туда, куда ваша роль не заходит, или адрес набран с ошибкой.', btn('На «Сегодня»', { variant: 'primary', action: 'nav', args: { name: 'home' } }), true)}</div>` };
})(window.P);

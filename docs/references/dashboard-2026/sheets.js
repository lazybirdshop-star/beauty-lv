/* Шторки, диалоги и меню. Шторка: { title, hint, size, body(st,a), foot(st,a) }. Диалог: { title, text, confirm, danger }. Меню: (st,a) → [{label, icon, action, args, danger}] */
(function (P) {
  const { icon, btn, esc, act, status, avatar, fmtTime, fmtDur, eur } = P;
  const sec = (title, body) => `<div class="sheet-section"><h3>${title}</h3>${body}</div>`;
  /* Закон подвала: слева отмена, справа главное действие. Разрушительное живёт в теле, в своей зоне. */
  const foot = (primary, o = {}) => `${btn(o.cancel || 'Отмена', { variant: 'ghost', action: 'closeSheet' })}<span class="grow"></span>${o.extra || ''}${primary}`;
  const danger = (title, body) => `<div class="sheet-section danger-zone"><h3>${title}</h3>${body}</div>`;
  const SWATCHES = ['', '#E2568A', '#C9426F', '#9164C4', '#684096', '#2E7A58', '#9A6712'];
  const memberSelect = (st, value) => (P.ctx(st).team ? P.field('Мастер', P.select(P.ctx(st).members.map((m) => [m.id, m.name]), value || 'anna')) : '');

  P.SHEETS = {
    newBooking: {
      title: 'Новая запись', hint: 'Клиент, услуги и время — и запись готова',
      body(st, a) {
        const c = P.ctx(st);
        const client = a.clientId ? P.clientOf(a.clientId) : null;
        const picked = st.ui.nbServices || ['s-mani-gel'];
        const total = picked.reduce((s, id) => s + P.serviceOf(id).price, 0), dur = picked.reduce((s, id) => s + P.serviceOf(id).duration, 0);
        return `
        ${sec('Кто придёт', (a.error === 'client' ? '<div class="field-error">Выберите клиента — без него запись не создать</div>' : '') + (client ? `<div class="row" style="padding:10px 12px;border-radius:12px;background:var(--sunken)">${avatar(client)}<div style="flex:1"><b style="font-weight:500">${esc(client.name)}</b><div class="t-meta num">${esc(client.phone)} · ${P.countOf(client.visits, ['визит', 'визита', 'визитов'])}</div></div>${btn('Изменить', { size: 'xs', variant: 'ghost', action: 'sheetArg', args: { key: 'clientId', value: null } })}</div>` : `<div class="input-wrap">${icon('search', 'lead')}${P.input({ placeholder: 'Имя или телефон' })}</div><div class="list" style="margin-top:2px">${P.CLIENTS.filter((x) => !x.dup).slice(0, 3).map((x) => `<button type="button" class="list-row click" style="grid-template-columns:auto 1fr auto;padding:8px 10px"${act('sheetArg', { key: 'clientId', value: x.id })}>${avatar(x, 'sm')}<div><div class="main-line" style="font-weight:400">${esc(x.name)}</div><div class="sub-line num">${esc(x.phone)} · ${P.countOf(x.visits, ['визит', 'визита', 'визитов'])}</div></div>${x.flag === 'fav' ? status('lilac', 'Любимый') : ''}</button>`).join('')}<button type="button" class="list-row click" style="grid-template-columns:auto 1fr;padding:8px 10px;color:var(--accent-ink)"${act('sheetArg', { key: 'clientId', value: 'k9' })}>${icon('plus')}<div class="main-line" style="font-weight:500">Новый клиент</div></button></div>`))}
        ${sec('Услуги', `<div class="chips">${c.services.filter((s) => s.visible).map((s) => `<button type="button" class="chip ${picked.includes(s.id) ? 'on' : ''}"${act('nbToggle', { id: s.id })}>${esc(s.name)} <span style="opacity:.7">· ${eur(s.price)}</span></button>`).join('')}</div>${c.services.filter((s) => picked.some((p) => (P.serviceOf(p).addons || []).includes(s.id)) && !picked.includes(s.id)).length ? `<div class="t-meta">Предложить дополнительно: ${c.services.filter((s) => picked.some((p) => (P.serviceOf(p).addons || []).includes(s.id)) && !picked.includes(s.id)).map((s) => esc(s.name)).join(', ')}</div>` : ''}`)}
        ${memberSelect(st, a.memberId)}
        ${sec('Когда', `${P.seg([['slots', 'Из свободных окон'], ['custom', 'Своё время']], st.ui.nbWhen || 'slots', 'nbWhen', 'block')}${(st.ui.nbWhen || 'slots') === 'slots' ? `<div class="t-meta">Сегодня, 12 сентября · нужно ${fmtDur(dur)} подряд</div><div class="chips">${['16:00', '17:00', '19:30'].map((t, i) => `<button type="button" class="chip ${i === 0 ? 'on' : ''}">${t}</button>`).join('')}</div><div class="chips"><span class="t-meta">пн 14 сен</span>${['10:00', '11:30', '14:00', '16:30'].map((t) => `<button type="button" class="chip">${t}</button>`).join('')}</div>` : `<div class="form-grid">${P.field('Дата', P.pickField('date', 'nb-date', 'сб, 12 сентября'))}${P.field('Время', P.pickField('time', 'nb-time', '16:00'))}</div><div class="t-meta">Окно на это время откроется и сразу займётся этой записью — на публичной странице оно свободным не появится.</div>`}`)}
        ${sec('Заметка', P.textarea({ placeholder: 'Видите только вы', rows: 2 }))}`;
      },
      foot(st) { const picked = st.ui.nbServices || ['s-mani-gel']; const total = picked.reduce((s, id) => s + P.serviceOf(id).price, 0), dur = picked.reduce((s, id) => s + P.serviceOf(id).duration, 0); return `${btn('Отмена', { variant: 'ghost', action: 'closeSheet' })}<div class="grow total"><span class="t-meta">Итого</span><b class="money">${eur(total)}</b><span class="t-meta">· ${fmtDur(dur)}</span></div>${btn('Создать запись', { variant: 'primary', action: 'submit', args: { msg: 'Запись создана', requireArg: 'clientId', error: 'client' } })}`; },
    },

    bookingDetail: {
      title: (st, a) => esc(P.clientOf(P.bookingOf(st, a.id).client).name), hint: (st, a) => { const b = P.bookingOf(st, a.id); return `${b.status === 'new' ? '<span class="tag-new">ждёт ответа</span>' : status(b.status)} <span class="muted">· создана ${esc(b.created)}${b.source === 'page' ? ', со страницы записи' : ''}</span>`; },
      body(st, a) {
        const b = P.bookingOf(st, a.id), cl = P.clientOf(b.client), s = P.serviceOf(b.service), m = P.memberOf(b.member);
        const now = P.NOW.h * 60 + P.NOW.m;
        const started = b.start <= now, done = b.status === 'completed' || b.status === 'cancelled' || b.status === 'noshow';
        return `
        <div class="cell rose" style="padding:16px 18px"><div class="row between"><div><div class="t-meta" style="color:inherit;opacity:.7">Сегодня, 12 сентября</div><div class="money" style="font-size:30px;line-height:1.1">${fmtTime(b.start)}–${fmtTime(b.end)}</div><div class="t-meta mt8" style="color:inherit;opacity:.8">${fmtDur(b.end - b.start)}${P.ctx(st).team ? ` · ${esc(m.short)}` : ''}</div></div>${done ? '' : btn('Перенести', { size: 'sm', variant: 'secondary', icon: 'move', action: 'sheet', args: { name: 'reschedule', id: b.id } })}</div></div>
        ${b.status === 'new' ? `<div class="row">${btn('Отклонить запись', { variant: 'ghost-danger', icon: 'x', action: 'dialog', args: { name: 'declineBooking', id: b.id } })}</div>` : ''}
        ${b.status === 'confirmed' && started ? `<div class="row">${btn('Клиент не пришёл', { variant: 'ghost-danger', icon: 'alert', action: 'noShow', args: { id: b.id } })}</div>` : b.status === 'confirmed' ? '<div class="t-meta">Завершить визит можно, когда он начнётся. Пока — перенести или отменить.</div>' : ''}
        ${sec('Клиент', `<div class="row" style="align-items:flex-start">${avatar(cl)}<div style="flex:1;min-width:0"><b style="font-weight:500">${esc(cl.name)}</b>${cl.visits === 0 ? ' <span class="chip xs">первый визит</span>' : ''}<div class="t-meta num">${esc(cl.phone)} · визитов: ${cl.visits}${cl.flag === 'fav' ? ' · любимый клиент' : ''}</div><div class="row mt8 wrap">${btn('Позвонить', { size: 'xs', variant: 'secondary', icon: 'phone' })}${btn('Написать', { size: 'xs', variant: 'secondary', icon: 'msg', action: 'menuAt', args: { name: 'write' } })}${btn('Карточка', { size: 'xs', variant: 'ghost', action: 'nav', args: { name: 'client', id: cl.id, close: true } })}</div></div></div>`)}
        ${sec('Услуги', `<div class="list"><div class="list-row" style="grid-template-columns:1fr auto;padding:8px 0"><div><div class="main-line" style="font-weight:400">${esc(s.name)}</div><div class="sub-line">${fmtDur(s.duration)}${s.buffer ? ` + ${s.buffer} мин на уборку` : ''}</div></div><b class="num" style="font-weight:500">${eur(s.price)}</b></div></div><div class="row between"><span class="t-meta">Итого</span><b class="money" style="font-size:18px">${eur(s.price)}</b></div>`)}
        ${sec('Заметка', `<div class="t-body">${b.note ? esc(b.note) : '<span class="muted">Заметки нет</span>'}</div>`)}
        ${b.status === 'confirmed' && b.source === 'page' ? '<div class="t-meta">Клиент может отменить сам за сутки до визита. Позже — только через вас.</div>' : ''}
        ${done ? '' : danger('Если визит не состоится', `${btn('Отменить запись', { size: 'sm', variant: 'ghost-danger', icon: 'x', action: 'dialog', args: { name: 'cancelBooking', id: b.id } })}<span class="t-meta">Клиент увидит запись как отменённую. Вернуть её будет нельзя.</span>`)}`;
      },
      foot(st, a) {
        const b = P.bookingOf(st, a.id); const done = ['completed', 'cancelled', 'noshow'].includes(b.status);
        const started = b.start <= P.NOW.h * 60 + P.NOW.m;
        const main = b.status === 'new' ? btn('Подтвердить запись', { variant: 'primary', icon: 'check', action: 'confirmBooking', args: { id: b.id, close: true } })
          : b.status === 'confirmed' && started ? btn('Завершить визит', { variant: 'primary', icon: 'check', action: 'completeBooking', args: { id: b.id, close: true } })
          : btn(done ? 'Изменить заметку' : 'Изменить запись', { variant: 'primary', icon: done ? '' : 'edit', action: 'sheet', args: { name: 'editBooking', id: b.id } });
        const extra = !done && (b.status === 'new' || (b.status === 'confirmed' && started)) ? btn('Изменить', { variant: 'secondary', icon: 'edit', action: 'sheet', args: { name: 'editBooking', id: b.id } }) : '';
        return foot(main, { cancel: 'Закрыть', extra });
      },
    },

    editBooking: {
      title: 'Изменить запись', hint: 'Правкой время не меняется. Чтобы перенести визит — «Перенести» в карточке записи.',
      body(st, a) { const b = P.bookingOf(st, a.id); const c = P.ctx(st); return `${sec('Услуги', `<div class="chips">${c.services.filter((s) => s.visible).map((s) => `<button type="button" class="chip ${s.id === b.service ? 'on' : ''}">${esc(s.name)} <span style="opacity:.7">· ${eur(s.price)}</span></button>`).join('')}</div><div class="t-meta">Для выбранных услуг нужно ${fmtDur(P.serviceOf(b.service).duration)} подряд — время есть.</div>`)}${memberSelect(st, b.member)}${sec('Заметка', P.textarea({ value: b.note, placeholder: 'Видите только вы', rows: 3 }))}`; },
      foot: () => foot(btn('Сохранить', { variant: 'primary', action: 'submit', args: { msg: 'Запись изменена' } })),
    },

    reschedule: {
      title: 'Перенести запись', hint: 'Клиент получит уведомление',
      body(st, a) { const b = P.bookingOf(st, a.id); const picks = st.ui.picks || {}; const nd = picks['rs-date'] || 'пн, 14 сентября'; const nt = picks['rs-time'] || '11:30'; return `<div class="move-pair"><div class="from"><span class="t-meta">Сейчас</span><b class="num">сегодня, ${fmtTime(b.start)}</b></div><i class="arrow" aria-hidden="true">${icon('arrowR')}</i><div class="to"><span class="t-meta">Новое время</span><b class="num">${esc(nd.replace(/^[а-я]{2}, /, ''))}, ${esc(nt)}</b></div></div>${sec('Выберите дату и время', `<div class="form-grid">${P.field('Дата', P.pickField('date', 'rs-date', 'пн, 14 сентября'))}${P.field('Время', P.pickField('time', 'rs-time', '11:30'))}</div><div class="t-meta">Свободные окна в этот день</div><div class="chips">${['10:00', '11:30', '14:00', '16:30'].map((t) => `<button type="button" class="chip ${nt === t ? 'on' : ''}"${act('pickSet', { key: 'rs-time', value: t })}>${t}</button>`).join('')}</div>`)}`; },
      foot: () => foot(btn('Перенести запись', { variant: 'primary', action: 'submit', args: { msg: 'Запись перенесена' } }), { cancel: 'Оставить как есть' }),
    },

    clientForm: {
      title: (st, a) => (a.id ? 'Редактировать клиента' : 'Новый клиент'), hint: 'Метку и заметку видите только вы — клиент их не увидит.',
      body(st, a) { const c = a.id ? P.clientOf(a.id) : {}; return `<div class="form-grid">${P.field('Имя', P.input({ value: c.name || '', placeholder: 'Имя и фамилия' }), '', { cls: 'full' })}${P.field('Телефон', P.input({ value: c.phone || '', placeholder: '+371' }))}${P.field('Почта', P.input({ value: c.email || '', placeholder: 'необязательно' }))}</div>${sec('Метка', `<div class="radio-cards">${[['', 'Без метки', ''], ['fav', 'Любимый клиент', 'Стоит рядом с именем везде'], ['attention', 'Осторожно', 'Напоминание себе']].map(([v, t, d]) => `<button type="button" class="radio-card ${(c.flag || '') === v ? 'on' : ''}"><i></i><div><b>${t}</b>${d ? `<span>${d}</span>` : ''}</div></button>`).join('')}</div>`)}${sec('Заметка', P.textarea({ value: c.notes || '', placeholder: 'То, что не спросишь дважды', rows: 3 }))}${a.id ? danger('Осторожные действия', `<div class="row wrap">${btn('Заблокировать клиента', { size: 'sm', variant: 'ghost-danger', icon: 'block', action: 'dialog', args: { name: 'blockClient', id: a.id } })}${btn('Удалить карточку', { size: 'sm', variant: 'ghost-danger', icon: 'trash', action: 'dialog', args: { name: 'deleteClient', id: a.id } })}</div><span class="t-meta">Блокировка закрывает клиенту запись на вашей странице. Удаление стирает карточку, история визитов остаётся.</span>`) : ''}`; },
      foot: () => foot(btn('Сохранить', { variant: 'primary', action: 'submit', args: { msg: 'Сохранено' } })),
    },

    blockTime: {
      title: 'Заблокировать время', hint: 'Клиенты не смогут записаться на это время, а открытые окна в нём снимутся',
      body(st, a) { return `${sec('Причина', `<div class="chips">${['Обед', 'Перерыв', 'Личное', 'Отпуск'].map((t, i) => `<button type="button" class="chip ${i === 0 ? 'on' : ''}">${t}</button>`).join('')}</div>${P.input({ value: 'Обед', placeholder: 'Например, обед' })}`)}${memberSelect(st, a.memberId)}${sec('Когда', `${P.field('Дата', P.pickField('date', 'bt-date', 'пн, 14 сентября'))}${P.switchRow('Весь день', '', false)}<div class="form-grid">${P.field('С', P.pickField('time', 'bt-from', '13:00'))}${P.field('До', P.pickField('time', 'bt-to', '14:00'))}</div>`)}${sec('Повтор', `${P.seg([['none', 'Не повторять'], ['weekly', 'Каждую неделю']], 'weekly', 'noop', 'block')}${P.field('До даты', P.pickField('date', 'bt-until', 'чт, 31 декабря'))}`)}<div class="t-meta">В это время открыто 1 окно — оно снимется. Записей клиентов нет.</div>`; },
      foot: () => foot(btn('Заблокировать', { variant: 'primary', action: 'submit', args: { msg: 'Время заблокировано, снято окон: 1' } })),
    },

    blockDetail: {
      title: 'Заблокированное время', hint: 'Клиентам это время не показывается',
      body(st, a) { const x = [...P.BLOCKS, ...P.SOLO_BLOCKS].find((b) => b.id === a.id) || P.BLOCKS[0]; const m = P.memberOf(x.member); return `<div class="cell tight" style="background:var(--sunken);box-shadow:none"><b style="font-weight:500;font-size:16px">${esc(x.title)}</b><div class="t-meta mt8">сегодня ${fmtTime(x.start)}–${fmtTime(x.end)} · ${fmtDur(x.end - x.start)}${P.ctx(st).team ? ` · ${esc(m.short)}` : ''}</div><div class="t-meta">повторяется каждую неделю до 31 декабря</div></div><div class="t-meta">Окна, снятые блоком, сами не вернутся — откройте время заново, если оно снова ваше.</div>${btn('Снять только сегодня', { size: 'sm', variant: 'secondary', action: 'submit', args: { msg: 'Блок снят на сегодня' } })}`; },
      foot: () => foot(btn('Снять блок', { variant: 'danger', action: 'submit', args: { msg: 'Блок снят' } }), { cancel: 'Закрыть' }),
    },

    slotDetail: {
      title: 'Свободное окно', hint: 'Клиент видит его на странице записи', more: (st, a) => ({ name: 'slotMore', id: a.id }),
      body(st, a) { const s = [...P.SLOTS, ...P.SOLO_SLOTS].find((x) => x.id === a.id) || P.SLOTS[0]; return `<div class="cell tight" style="border:1.5px dashed var(--accent-ink);box-shadow:none"><b class="num" style="font-weight:500;font-size:22px">${fmtTime(s.start)}–${fmtTime(s.end)}</b><div class="t-meta mt8">сегодня, 12 сентября · ${fmtDur(s.end - s.start)}${P.ctx(st).team ? ` · ${esc(P.memberOf(s.member).short)}` : ''}</div>${s.hidden ? `<div class="mt8">${status('plain', 'Скрыто от клиентов')}</div>` : ''}</div>${sec('Перенести окно', `<div class="form-grid">${P.field('Дата', P.pickField('date', 'sd-date', 'сб, 12 сентября'))}${P.field('Время', P.pickField('time', 'sd-time', fmtTime(s.start)))}</div>${btn('Перенести окно', { size: 'sm', variant: 'secondary', action: 'submit', args: { msg: 'Окно перенесено' } })}`)}${danger('Убрать окно', `${btn('Удалить окно', { size: 'sm', variant: 'ghost-danger', icon: 'trash', action: 'dialog', args: { name: 'deleteSlot', id: a.id } })}<span class="t-meta">Окно исчезнет со страницы записи. ${s.hidden ? 'Сейчас оно и так скрыто от клиентов.' : 'Скрыть его на время можно в меню шторки.'}</span>`)}`; },
      foot: (st, a) => foot(btn('Записать клиента', { variant: 'primary', icon: 'plus', action: 'sheet', args: { name: 'newBooking', replace: true } }), { cancel: 'Закрыть' }),
    },

    publishSlot: {
      title: 'Открыть время', hint: 'Клиенты видят только то время, которое вы открыли',
      body(st, a) { return `<div class="seg block"><button type="button" class="on">Одно окно</button><button type="button"${act('sheet', { name: 'publishPeriod', replace: true })}>Период или повтор</button></div><div class="form-grid">${P.field('Дата', P.pickField('date', 'ps-date', 'сб, 12 сентября'))}${P.field('Время', P.pickField('time', 'ps-time', a.time || '16:30'))}${P.field('Длительность', P.select([['30', '30 мин'], ['60', '1 ч'], ['90', '1 ч 30 мин'], ['120', '2 ч']], '60'))}${P.ctx(st).team ? P.field('Мастер', P.select(P.ctx(st).members.map((m) => [m.id, m.name]), a.member || 'anna')) : ''}</div><div class="t-meta">Окно откроется на странице записи сразу. Чтобы открыть неделю или месяц, переключитесь наверху на «Период или повтор».</div>`; },
      foot: () => foot(btn('Опубликовать окно', { variant: 'primary', action: 'submit', args: { msg: 'Открыто окно 16:30', undo: true } })),
    },

    publishPeriod: {
      title: 'Опубликовать период', hint: 'Окна создаются явно — шаблонов рабочих часов нет',
      body(st) { return `<div class="form-grid">${P.field('С даты', P.pickField('date', 'pp-from', 'пн, 14 сентября'))}${P.field('По дату', P.pickField('date', 'pp-to', 'вс, 27 сентября'))}</div>${P.field('Дни недели', `<div class="chips">${['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((d, i) => `<button type="button" class="chip ${i < 6 ? 'on' : ''}">${d}</button>`).join('')}</div>`)}<div class="form-grid">${P.field('Начало дня', P.pickField('time', 'pp-start', '10:00'))}${P.field('Конец дня', P.pickField('time', 'pp-end', '19:00'))}${P.field('Шаг между окнами', P.select([['30', '30 мин'], ['60', '1 ч'], ['90', '1 ч 30 мин']], '60'))}${P.ctx(st).team ? P.field('Мастер', P.select(P.ctx(st).members.map((m) => [m.id, m.name]), 'anna')) : ''}</div><div class="cell lilac tight"><div class="t-meta" style="color:inherit;opacity:.75">Будет опубликовано</div><b class="money" style="font-size:26px">108 окон</b><div class="t-meta" style="color:inherit;opacity:.75">12 рабочих дней · 9 окон в день · 3 уже открыто · 2 заблокировано</div></div>${danger('Обратное действие', `${btn('Снять окна за период', { size: 'sm', variant: 'ghost-danger', icon: 'trash', action: 'sheet', args: { name: 'clearPeriod', replace: true } })}<span class="t-meta">Занятое время останется: записи снимаются только вручную.</span>`)}`; },
      foot: () => foot(btn('Опубликовать 108 окон', { variant: 'primary', action: 'submit', args: { msg: 'Опубликовано 108, пропущено 5 — уже были' } })),
    },

    clearPeriod: {
      title: 'Окна за период', hint: 'Занятое время останется: записи снимаются только вручную',
      body() { return `${P.seg([['remove', 'Снять'], ['hide', 'Скрыть'], ['show', 'Показать']], 'remove', 'noop', 'block')}<div class="form-grid">${P.field('С даты', P.pickField('date', 'cp-from', 'пн, 21 сентября'))}${P.field('По дату', P.pickField('date', 'cp-to', 'вс, 27 сентября'))}</div><div class="cell tight" style="background:var(--sunken);box-shadow:none"><div class="t-meta">Свободных окон в этих числах</div><b style="font-size:22px" class="money">41</b><div class="t-meta">Занятых: 6 — останутся</div></div>`; },
      foot: () => foot(btn('Снять 41 окно', { variant: 'danger', action: 'submit', args: { msg: 'Снято окон: 41' } })),
    },

    serviceForm: {
      title: (st, a) => (a.id ? 'Редактировать услугу' : 'Новая услуга'), hint: 'Название, длительность и цена — этого достаточно, чтобы клиент мог записаться',
      body(st, a) { const s = a.id ? P.serviceOf(a.id) : { duration: 60, buffer: 10, price: 35, visible: true, performers: [] }; const c = P.ctx(st); return `${P.field('Название', P.input({ value: s.name || '', placeholder: 'Например: маникюр с покрытием' }))}${P.field('Категория', P.select([...P.CATEGORIES.map((x) => [x.id, x.name])], s.cat || 'c-none'))}<div class="form-grid">${P.field('Длительность, мин', P.input({ type: 'number', value: s.duration }))}${P.field('Уборка после, мин', P.input({ type: 'number', value: s.buffer }))}${P.field('Цена, €', P.input({ type: 'number', value: s.price }))}${P.field('Цена «от»', `<div class="row" style="height:44px">${P.switch_(false)}<span class="t-meta">клиент увидит «от ${eur(s.price)}»</span></div>`)}</div><div class="t-meta">Визит займёт ${fmtDur(s.duration + s.buffer)} — ${fmtDur(s.duration)} работы и ${s.buffer} мин на уборку</div>${P.field('Описание', P.textarea({ value: s.desc || '', placeholder: 'Клиент увидит его в разделе «Цены»', rows: 2 }))}${P.field('Цвет метки', `<div class="swatches">${SWATCHES.map((c2) => `<span class="swatch ${(s.color || '') === c2 ? 'on' : ''} ${c2 ? '' : 'none'}" style="${c2 ? `background:${c2}` : ''}"></span>`).join('')}</div>`, 'Метка помогает узнать услугу в календаре.')}${c.team ? sec('Кто выполняет услугу', `<div class="t-meta">Клиент увидит только тех, кто отмечен.</div>${c.members.map((m) => P.switchRow(esc(m.name), esc(m.trade), s.performers.includes(m.id))).join('')}`) : ''}${sec('Предложить дополнительно', `<div class="chips">${c.services.filter((x) => x.id !== s.id).slice(0, 5).map((x) => `<button type="button" class="chip xs ${(s.addons || []).includes(x.id) ? 'on' : ''}">${esc(x.name)}</button>`).join('')}</div><div class="t-meta">Клиент выберет эту услугу — и увидит предложение добавить отмеченные.</div>`)}${P.field('Фото примера работы', P.upload('JPG, PNG или WebP · до 5 МБ'))}${P.switchRow('Показывать клиентам', 'Скрытая услуга исчезает из прайса и записи', s.visible)}${a.id ? danger('Убрать услугу', `${btn('Удалить услугу', { size: 'sm', variant: 'ghost-danger', icon: 'trash', action: 'dialog', args: { name: 'deleteService', id: a.id } })}<span class="t-meta">Услуга исчезнет из прайса и записи. История визитов останется.</span>`) : ''}`; },
      foot: () => foot(btn('Сохранить', { variant: 'primary', action: 'submit', args: { msg: 'Услуга сохранена' } })),
    },

    categoryForm: {
      title: (st, a) => (a.id ? 'Редактировать категорию' : 'Новая категория'), hint: 'Категории группируют услуги на странице записи',
      body(st, a) { const c = a.id ? P.CATEGORIES.find((x) => x.id === a.id) : { visible: true }; return `${P.field('Название', P.input({ value: c.name || '', placeholder: 'Например, Стрижка' }))}${P.field('Цвет', `<div class="swatches">${SWATCHES.map((c2) => `<span class="swatch ${(c.color || '') === c2 ? 'on' : ''} ${c2 ? '' : 'none'}" style="${c2 ? `background:${c2}` : ''}"></span>`).join('')}</div>`)}${P.switchRow('Показывать категорию', 'Выключенная категория исчезает со страницы записи. Услуги внутри остаются активными и видны отдельно.', c.visible)}${a.id ? danger('Убрать категорию', `${btn('Удалить категорию', { size: 'sm', variant: 'ghost-danger', icon: 'trash', action: 'dialog', args: { name: 'deleteCategory', id: a.id } })}<span class="t-meta">Услуги внутри останутся и перейдут в «Без категории».</span>`) : ''}`; },
      foot: () => foot(btn('Сохранить', { variant: 'primary', action: 'submit', args: { msg: 'Категория сохранена' } })),
    },

    invite: {
      title: 'Приглашение в команду', hint: 'Человек получит письмо со ссылкой. Ссылка действует семь дней.',
      body(st, a) { return `${P.field('Почта', P.input({ placeholder: 'name@example.com', type: 'email', attrs: ' id="invite-email"' }), '', { error: a.error === 'email' ? 'Без почты приглашение не отправить' : '' })}${P.field('Имя в салоне', P.input({ placeholder: 'Как называть человека клиентам' }), 'Пусто — имя из аккаунта.')}${sec('Роль', `<div class="radio-cards">${[['admin', 'Администратор', 'Календарь, записи, клиенты, услуги, страница и команда. Без настроек заведения и ведомости выплат.'], ['master', 'Мастер', 'Свой день и общая адресная книга. Без прайса, команды и страницы.']].map(([v, t, d], i) => `<button type="button" class="radio-card ${i === 1 ? 'on' : ''}"><i></i><div><b>${t}</b><span>${d}</span></div></button>`).join('')}</div>`)}<div class="t-meta">Тариф «Салон» разрешает до 10 участников. Сейчас 5, ещё одно приглашение ждёт ответа.</div>`; },
      foot: () => foot(btn('Отправить приглашение', { variant: 'primary', action: 'submit', args: { msg: 'Приглашение отправлено', requireInput: '#invite-email', error: 'email' } })),
    },

    compensation: {
      title: 'Условия расчёта', hint: 'Новые условия действуют с даты и не меняют утверждённые ведомости',
      body(st, a) { const m = P.memberOf(a.id); return `<div class="row">${avatar(m)}<b style="font-weight:500">${esc(m.name)}</b></div>${sec('Вид расчёта', `<div class="radio-cards">${[['percent', 'Процент от дохода', ''], ['rent', 'Аренда кресла', 'Минус у мастера — аренда за период больше дохода'], ['salary', 'Оклад и процент', '']].map(([v, t, d], i) => `<button type="button" class="radio-card ${i === 0 ? 'on' : ''}"><i></i><div><b>${t}</b>${d ? `<span>${d}</span>` : ''}</div></button>`).join('')}</div>`)}<div class="form-grid">${P.field('Процент мастеру', `<div class="input-wrap">${P.input({ type: 'number', value: '50' })}<span class="suffix">%</span></div>`)}${P.field('Действуют с', P.pickField('date', 'cm-from', 'чт, 1 октября'))}</div>${sec('История условий', `<dl class="kv wide"><dt>с 1 июля 2026</dt><dd>50% от дохода</dd><dt>с 19 июня 2025</dt><dd>40% от дохода</dd></dl>`)}`; },
      foot: () => foot(btn('Сохранить условия', { variant: 'primary', action: 'submit', args: { msg: 'Условия сохранены' } })),
    },

    studioPublish: {
      title: 'Опубликовать изменения', hint: 'Клиенты увидят страницу такой сразу после публикации', size: 'narrow',
      body(st) { const w = P.worldName(st.ui.studioWorld || 'soft'); return `<dl class="kv wide">${[['Стиль', w === 'Мягкий' ? 'Мягкий — без изменений' : `Мягкий → ${w}`], ['Цвет кнопок', 'как в стиле'], ['Фото шапки', 'заменено'], ['Движение', 'живое']].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl><div class="t-meta">Публикация №5. Опубликованное оформление всегда можно откатить к предыдущей версии.</div>`; },
      foot: () => foot(btn('Опубликовать', { variant: 'primary', action: 'submit', args: { msg: 'Опубликовано. Страница обновлена.' } }), { cancel: 'Ещё поредактирую' }),
    },
    studioHistory: {
      title: 'История', hint: 'Публикации страницы', size: 'narrow',
      body() { return `<div class="list">${[['№4', '9 сен 2026, 18:20', 'Мягкий', true], ['№3', '28 авг 2026, 11:02', 'Мягкий, свои настройки', false], ['№2', '14 июл 2026, 09:15', 'Плакат', false], ['№1', '3 мар 2025, 16:40', 'Мягкий', false]].map(([n, d, s, cur]) => `<div class="list-row" style="grid-template-columns:1fr auto"><div><div class="main-line">Публикация ${n}${cur ? ' <span class="status ok">Сейчас</span>' : ''}</div><div class="sub-line">${d} · ${s}</div></div>${cur ? '' : btn('Вернуть', { size: 'xs', variant: 'secondary', action: 'submit', args: { msg: `Возврат к ${n}` } })}</div>`).join('')}</div>`; },
      foot: () => `<span class="grow"></span>${btn('Закрыть', { variant: 'secondary', action: 'closeSheet' })}`,
    },

    rejectRequest: {
      title: 'Отклонить заявку', hint: 'Причина уйдёт человеку письмом', size: 'narrow',
      body() { return `${P.field('Причина отказа', P.textarea({ placeholder: 'Например: платформа пока открыта только для мастеров в Латвии.', rows: 4 }))}`; },
      foot: () => foot(btn('Отклонить и написать', { variant: 'danger', action: 'submit', args: { msg: 'Отказ отправлен письмом' } })),
    },
    assignPlan: {
      title: (st, a) => `Тариф · ${esc(a.org || 'Lumen Studio')}`, hint: 'Назначить или сменить тариф этой организации', size: 'narrow',
      body() { return `<div class="radio-cards">${[['solo', 'Соло · 12 € / мес', 'Один мастер, страница и календарь'], ['salon', 'Салон · 39 € / мес', 'До 10 участников, ресепшен, выплаты'], ['salon-y', 'Салон, год · 390 € / год', 'Два месяца бесплатно']].map(([v, t, d], i) => `<button type="button" class="radio-card ${i === 1 ? 'on' : ''}"><i></i><div><b>${t}</b><span>${d}</span></div></button>`).join('')}</div>`; },
      foot: () => foot(btn('Сохранить тариф', { variant: 'primary', action: 'submit', args: { msg: 'Тариф назначен' } })),
    },
    plans: {
      title: 'Тарифы', hint: 'Архив прячет тариф из выбора, но не отнимает его у салонов', size: 'narrow',
      body() { return `<div class="list">${[['Соло', '12 € / мес', 'до 1 участника', 31], ['Салон', '39 € / мес', 'до 10 участников', 14], ['Салон, год', '390 € / год', 'до 10 участников', 2]].map(([n, p, l, c]) => `<div class="list-row" style="grid-template-columns:1fr auto"><div><div class="main-line">${n} <span class="muted" style="font-weight:400">· ${p}</span></div><div class="sub-line">${l} · назначен ${P.countOf(c, ['салону', 'салонам', 'салонам'])}</div></div>${btn('', { size: 'sm', variant: 'ghost', icon: 'more', title: 'Действия с тарифом', action: 'menuAt', args: { name: 'planRow' } })}</div>`).join('')}</div>`; },
      foot: () => foot(btn('Добавить тариф', { variant: 'primary', icon: 'plus', action: 'submit', args: { msg: 'Тариф сохранён' } }), { cancel: 'Закрыть' }),
    },
    announcement: {
      title: 'Новое объявление', hint: 'Полоса, которую увидят мастера и салоны в кабинете',
      body() { return `${P.field('Заголовок', P.input({ placeholder: 'Коротко: о чём это' }))}${P.field('Текст объявления', P.textarea({ placeholder: 'Например: завтра с 9 до 11 продукт будет недоступен — записи и страницы не пострадают.', rows: 3 }))}${P.field('Кому', P.seg([['all', 'Всем'], ['m', 'Мастерам'], ['s', 'Салонам']], 'all', 'noop', 'block'))}<div class="form-grid">${P.field('Показывать с', P.pickField('date', 'an-from', 'Сразу'), 'Пусто — показывать сразу.')}${P.field('Показывать до', P.pickField('date', 'an-to', 'Пока не снимут'), 'Без даты объявление будет висеть, пока его не снимут руками.')}</div>`; },
      foot: () => foot(btn('Опубликовать', { variant: 'primary', action: 'submit', args: { msg: 'Объявление опубликовано' } })),
    },
    activity: {
      title: 'Что нового', hint: 'Записи клиентов и их отмены за две недели', size: 'narrow',
      body(st) { return `<div class="list activity">${P.activityOf(st).map((x) => `<button type="button" class="list-row click activity-row"${act('openBooking', { id: x.booking || 'b9' })}><i class="dot" style="${x.unread ? '' : 'opacity:0'}"></i><b class="main-line" style="font-weight:${x.unread ? 500 : 400}">${esc(x.who)}</b><span class="t-meta when">${x.when}</span><span class="sub-line">${x.kind === 'booked' ? 'Записалась' : 'Отменила'} · ${esc(x.what)}</span></button>`).join('')}</div>`; },
      foot: () => foot(btn('Все записи', { variant: 'primary', action: 'nav', args: { name: 'bookings', close: true } }), { cancel: 'Закрыть' }),
    },
    create: {
      title: 'Создать', hint: 'Что завести', size: 'narrow',
      body(st) { return `<div class="list">${P.createItems(st).map((it) => `<button type="button" class="list-row click" style="grid-template-columns:auto 1fr auto"${act(it.action, { ...it.args, replace: true })}><span class="iconbtn ghost" style="width:36px;height:36px">${icon(it.icon)}</span><div><div class="main-line">${it.label}</div><div class="sub-line">${it.hint}</div></div>${icon('chevR', 'muted')}</button>`).join('')}</div>`; },
    },
    more: {
      title: 'Ещё', hint: '', size: 'narrow',
      body(st) { return `<div class="list">${st.nav.filter((it) => !P.tabKeys(st).includes(it.key)).map((it) => `<button type="button" class="list-row click" style="grid-template-columns:auto 1fr auto"${act('nav', { name: it.key, close: true })}><span class="iconbtn ghost" style="width:36px;height:36px">${icon(it.icon)}</span><div><div class="main-line">${it.label}</div>${it.hint ? `<div class="sub-line">${it.hint}</div>` : ''}</div>${it.badge ? `<span class="badge ${it.badgeTone || ''}">${it.badge}</span>` : icon('chevR', 'muted')}</button>`).join('')}</div><div class="list more-foot"><button type="button" class="list-row click" style="grid-template-columns:auto 1fr auto"${act('toast', { msg: 'Открыли бы письмо в support@amolie.com', closeMenu: true })}><span class="iconbtn ghost" style="width:36px;height:36px">${icon('help')}</span><div><div class="main-line">Помощь</div><div class="sub-line">Написать в поддержку</div></div></button><button type="button" class="list-row click" style="grid-template-columns:auto 1fr auto"${act('dialog', { name: 'logout' })}><span class="iconbtn ghost" style="width:36px;height:36px">${icon('logout')}</span><div><div class="main-line">Выйти</div><div class="sub-line">Понадобится пароль, чтобы вернуться</div></div></button></div>`; },
    },
  };

  P.DIALOGS = {
    declineBooking: { title: 'Отклонить запись?', text: 'Клиент увидит, что запись не принята. Вернуть её будет нельзя.', confirm: 'Отклонить', danger: true, msg: 'Запись отклонена' },
    cancelBooking: { title: 'Отменить запись?', text: (st, a) => `${esc(P.clientOf(P.bookingOf(st, a.id).client).name)} увидит запись как отменённую. Вернуть её будет нельзя.`, confirm: 'Отменить запись', danger: true, msg: 'Запись отменена' },
    logout: { title: 'Выйти из кабинета?', text: 'Чтобы вернуться, нужно будет снова ввести пароль.', confirm: 'Выйти', msg: 'Вы вышли (в прототипе — остались)' },
    deleteService: { title: 'Удалить услугу?', text: (st, a) => `«${esc(P.serviceOf(a.id).name)}» будет скрыта из прайса и записи.`, confirm: 'Удалить', danger: true, msg: 'Услуга удалена' },
    deleteCategory: { title: 'Удалить категорию?', text: 'Услуги внутри останутся и перейдут в «Без категории» — ничего не пропадёт.', confirm: 'Удалить', danger: true, msg: 'Категория удалена' },
    deleteClient: { title: 'Удалить клиента?', text: 'Карточка исчезнет из списка. История визитов останется в записях.', confirm: 'Удалить', danger: true, msg: 'Клиент удалён' },
    blockClient: { title: 'Заблокировать клиента?', text: 'Клиент не сможет записаться через вашу страницу. Уже назначенные визиты останутся. Разблокировать можно в любой момент.', confirm: 'Заблокировать', danger: true, msg: 'Клиент заблокирован' },
    deleteSlot: { title: 'Удалить окно?', text: 'Окно исчезнет со страницы записи.', confirm: 'Удалить', danger: true, msg: 'Окно удалено', undo: true },
    revokeInvite: { title: 'Отозвать приглашение?', text: 'Ссылка перестанет работать. Пригласить этот адрес можно будет заново.', confirm: 'Отозвать', danger: true, msg: 'Приглашение отозвано' },
    disableMember: { title: (st, a) => `Отстранить ${esc(P.memberOf(a.id).short)}?`, text: 'Человек сразу потеряет доступ к кабинету. История визитов останется на месте, вернуть его можно в любой момент. За ним записано будущих визитов: 22 — их нужно будет передать кому-то другому.', confirm: 'Отстранить', danger: true, msg: 'Участник отстранён' },
    deleteDraft: { title: 'Удалить черновик ведомости?', text: 'Черновик за август исчезнет. Рассчитать заново можно в любой момент.', confirm: 'Удалить', danger: true, msg: 'Черновик удалён' },
    studioRevert: { title: 'Вернуться к опубликованному?', text: 'Все правки этой сессии исчезнут. Страница уже и так выглядит так у клиентов.', confirm: 'Вернуться', danger: true, msg: 'Черновик сброшен' },
    impersonate: { title: 'Войти в кабинет мастера?', text: 'Режим поддержки: вы увидите кабинет её глазами. Сменить пароль или почту оттуда нельзя, а вход останется в журнале.', confirm: 'Войти в кабинет', msg: 'Режим поддержки: вы в кабинете «Lumen Studio»' },
    deleteAccount: { title: 'Удалить аккаунт?', text: 'Личные данные будут стёрты, салон закрыт, публичная страница перестанет отвечать. История записей салона сохранится, но станет невидимой. Отменить это нельзя.', confirm: 'Удалить аккаунт', danger: true, msg: 'Сначала отмените предстоящие визиты: их 14' },
    maintenance: { title: 'Включить режим обслуживания?', text: 'Клиенты не смогут записаться, а мастера — сохранить ни одного изменения. Выключается тем же переключателем.', confirm: 'Включить', danger: true, msg: 'Режим обслуживания включён' },
    pauseBookings: { title: 'Остановить запись на всей платформе?', text: 'Ни один клиент не сможет записаться ни к одному мастеру, пока вы не включите запись обратно.', confirm: 'Остановить', danger: true, msg: 'Запись остановлена' },
    removeAnnouncement: { title: 'Снять объявление?', text: 'Мастера перестанут его видеть. Отметки о прочтении сохранятся.', confirm: 'Снять', msg: 'Объявление снято' },
    blockUser: { title: 'Заблокировать пользователя?', text: 'Человек немедленно потеряет доступ: открытые сессии перестанут работать на первом же запросе. Действие обратимо.', confirm: 'Заблокировать', danger: true, msg: 'Пользователь заблокирован' },
  };

  P.createItems = (st) => {
    const items = [{ label: 'Новая запись', hint: 'Клиент, услуга и время', icon: 'plus', action: 'sheet', args: { name: 'newBooking' } }];
    if (st.caps.canManageCalendar) items.push({ label: 'Открыть время', hint: 'Окно или период для онлайн-записи', icon: 'clock', action: 'sheet', args: { name: 'publishSlot' } }, { label: 'Заблокировать время', hint: 'Обед, перерыв, отпуск', icon: 'block', action: 'sheet', args: { name: 'blockTime' } });
    if (st.caps.canManageClients) items.push({ label: 'Новый клиент', hint: 'Карточка в базу', icon: 'user', action: 'sheet', args: { name: 'clientForm' } });
    if (st.caps.canManageServices) items.push({ label: 'Новая услуга', hint: 'В прайс и на страницу', icon: 'services', action: 'sheet', args: { name: 'serviceForm' } });
    if (st.caps.canManageTeam) items.push({ label: 'Пригласить мастера', hint: 'Письмо со ссылкой на семь дней', icon: 'team', action: 'sheet', args: { name: 'invite' } });
    return items;
  };

  P.MENUS = {
    create: (st) => P.createItems(st).map((it) => ({ label: it.label, icon: it.icon, action: it.action, args: it.args })),
    account: (st) => [{ head: `${esc(P.ctx(st).me.name)} · ${{ solo: 'Мастер', owner: 'Владелица', admin: 'Администратор', master: 'Мастер', platform: 'Администратор платформы' }[st.role]}` }, { label: 'Настройки', icon: 'settings', action: 'nav', args: { name: st.role === 'platform' ? 'admin-settings' : 'settings' } }, { label: st.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема', icon: st.theme === 'dark' ? 'sun' : 'moon', action: 'setTheme', args: { value: st.theme === 'dark' ? 'light' : 'dark' } }, { label: 'Помощь', icon: 'help', action: 'toast', args: { msg: 'Открыли бы письмо в support@amolie.com' } }, { hr: true }, { label: 'Выйти', icon: 'logout', action: 'dialog', args: { name: 'logout' } }],
    bookingRow: (st, a) => [{ label: 'Открыть запись', icon: 'bookings', action: 'openBooking', args: { id: a.id } }, { label: 'Перенести', icon: 'move', action: 'sheet', args: { name: 'reschedule', id: a.id } }, { label: 'Не пришёл', icon: 'alert', action: 'noShow', args: { id: a.id } }, { hr: true }, { label: 'Отменить запись', icon: 'x', action: 'dialog', args: { name: 'cancelBooking', id: a.id }, danger: true }],
    serviceRow: (st, a) => [{ label: 'Изменить', icon: 'edit', action: 'sheet', args: { name: 'serviceForm', id: a.id } }, { label: P.serviceOf(a.id).visible ? 'Скрыть у клиентов' : 'Показывать клиентам', icon: P.serviceOf(a.id).visible ? 'eyeOff' : 'eye', action: 'toast', args: { msg: 'Сохранено' } }, { label: 'Выше', icon: 'chevL', action: 'noop' }, { hr: true }, { label: 'Удалить', icon: 'trash', action: 'dialog', args: { name: 'deleteService', id: a.id }, danger: true }],
    pick: (st, a) => {
      const dates = [['сб, 12 сентября', 'сегодня'], ['вс, 13 сентября', 'завтра'], ['пн, 14 сентября', ''], ['вт, 15 сентября', ''], ['ср, 16 сентября', ''], ['чт, 17 сентября', ''], ['пт, 18 сентября', '']];
      const times = ['09:00', '10:00', '11:00', '11:30', '12:00', '13:00', '14:00', '15:00', '16:00', '16:30', '17:00', '18:00', '19:00'];
      return [{ head: a.kind === 'date' ? 'Выберите день' : 'Выберите время' }, ...(a.kind === 'date' ? dates.map(([v, h]) => ({ label: h ? `${v} · ${h}` : v, action: 'pickSet', args: { key: a.key, value: v } })) : times.map((t) => ({ label: t, action: 'pickSet', args: { key: a.key, value: t } })))];
    },
    clientMore: (st, a) => [{ label: 'Изменить карточку', icon: 'edit', action: 'sheet', args: { name: 'clientForm', id: a.id } }, { label: 'Скачать историю визитов', icon: 'download', action: 'toast', args: { msg: 'Файл скачивается' } }, { label: 'Заблокировать клиента', icon: 'block', action: 'dialog', args: { name: 'blockClient', id: a.id } }, { hr: true }, { label: 'Удалить карточку', icon: 'trash', action: 'dialog', args: { name: 'deleteClient', id: a.id }, danger: true }],
    payoutRow: () => [{ label: 'Скачать ведомость', icon: 'download', action: 'toast', args: { msg: 'Файл скачивается' } }, { hr: true }, { label: 'Удалить черновик', icon: 'trash', action: 'dialog', args: { name: 'deleteDraft' }, danger: true }],
    memberMore: (st, a) => [{ label: 'Сменить роль', icon: 'key', action: 'toast', args: { msg: 'Роль меняется в блоке «Доступ» ниже' } }, { label: 'Условия расчёта', icon: 'banknote', action: 'sheet', args: { name: 'compensation', id: a.id } }, { hr: true }, { label: 'Отстранить', icon: 'block', action: 'dialog', args: { name: 'disableMember', id: a.id }, danger: true }],
    write: () => [{ label: 'SMS', icon: 'msg', action: 'toast', args: { msg: 'Открыли бы SMS' } }, { label: 'WhatsApp', icon: 'msg', action: 'toast', args: { msg: 'Открыли бы WhatsApp' } }, { label: 'Instagram', icon: 'msg', action: 'toast', args: { msg: 'Открыли бы Instagram' } }],
    emptySlot: (st, a) => [{ head: `${esc(P.memberOf(a.member).short)} · выберите действие для этого времени` }, { label: 'Открыть 16:30 для записи', icon: 'clock', action: 'toast', args: { msg: 'Открыто окно 16:30', undo: true } }, { label: 'Записать клиента', icon: 'plus', action: 'sheet', args: { name: 'newBooking', memberId: a.member } }, { label: 'Заблокировать время', icon: 'block', action: 'sheet', args: { name: 'blockTime', memberId: a.member } }, { hr: true }, { label: 'Период или повтор…', icon: 'calendar', action: 'sheet', args: { name: 'publishPeriod' } }],
    adminMaster: (st, a) => [{ label: 'Открыть карточку', icon: 'user', action: 'nav', args: { name: 'admin-master', id: a.id || 'm1' } }, { label: 'Открыть страницу', icon: 'external', action: 'toast', args: { msg: 'Открыли бы страницу' } }, { label: 'Войти в кабинет', icon: 'eye', action: 'dialog', args: { name: 'impersonate' } }, { label: 'Сменить тариф', icon: 'card', action: 'sheet', args: { name: 'assignPlan', org: (P.ADMIN.masters.find((m) => m.id === a.id) || {}).org } }, { hr: true }, { label: 'Заблокировать', icon: 'block', action: 'dialog', args: { name: 'blockUser' }, danger: true }],
    adminOrg: (st, a) => [{ label: 'Открыть карточку', icon: 'building', action: 'nav', args: { name: 'admin-master', id: (P.ADMIN.masters.find((m) => m.org === a.id) || { id: 'm2' }).id } }, { label: 'Изменить состояние', icon: 'activity', action: 'toast', args: { msg: 'Состояние меняется в карточке' } }, { label: 'Назначить тариф', icon: 'card', action: 'sheet', args: { name: 'assignPlan', org: a.id } }],
    adminUser: () => [{ label: 'Изменить роль', icon: 'key', action: 'toast', args: { msg: 'Роль сохранена' } }, { label: 'Выгрузить данные', icon: 'download', action: 'toast', args: { msg: 'Готовим выгрузку' } }, { hr: true }, { label: 'Заблокировать', icon: 'block', action: 'dialog', args: { name: 'blockUser' }, danger: true }],
    slotMore: (st, a) => { const x = [...P.SLOTS, ...P.SOLO_SLOTS].find((y) => y.id === a.id) || P.SLOTS[0]; return [{ label: x.hidden ? 'Показать клиентам' : 'Скрыть от клиентов', icon: x.hidden ? 'eye' : 'eyeOff', action: 'toast', args: { msg: x.hidden ? 'Окно показано клиентам' : 'Окно скрыто от клиентов', undo: true } }, { label: 'Открыть период', icon: 'calendar', action: 'sheet', args: { name: 'publishPeriod', replace: true } }]; },
    announcementRow: (st, a) => [{ label: 'Изменить', icon: 'edit', action: 'sheet', args: { name: 'announcement' } }, ...(a.state !== 'ended' ? [{ hr: true }, { label: 'Снять объявление', icon: 'block', action: 'dialog', args: { name: 'removeAnnouncement' }, danger: true }] : [])],
    planRow: () => [{ label: 'Изменить тариф', icon: 'edit', action: 'toast', args: { msg: 'Тариф изменён' } }, { label: 'В архив', icon: 'block', action: 'toast', args: { msg: 'Тариф в архиве' } }],
    adminSub: (st, a) => [{ label: 'Сменить тариф', icon: 'card', action: 'sheet', args: { name: 'assignPlan', org: a.id } }, { label: 'Заморозить', icon: 'lock', action: 'toast', args: { msg: 'Подписка заморожена' } }, { hr: true }, { label: 'Отменить', icon: 'x', action: 'toast', args: { msg: 'Подписка отменена' }, danger: true }],
  };

  P.activityOf = (st) => (st.role === 'solo' ? P.SOLO_ACTIVITY : st.caps && st.caps.isPlatform ? [] : P.ACTIVITY);
  P.bookingOf = (st, id) => [...P.BOOKINGS, ...P.SOLO_BOOKINGS].find((b) => b.id === id) || P.BOOKINGS[0];
})(window.P);

/* AMOLIE primitives. Plain React, no build step, no imports.
   Load after React and ReactDOM; components land on window.AMOLIE. */
(() => {
  const h = React.createElement;
  const T = {
    ink: '#0E0E10', paper: '#F5F0EA', accent: '#E2568A',
    s2: '#16161A', s3: '#1B1B20',
    lightField: '#F1F2F4', lightCard: '#FFFFFF', lightInk: '#14131A',
    ease: 'cubic-bezier(.22,1,.36,1)',
    font: "'Onest', system-ui, sans-serif"
  };
  const theme = (t) => t === 'light'
    ? { fg: T.lightInk, row: T.lightCard, line: 'rgba(20,19,26,0.14)', lineStrong: 'rgba(20,19,26,0.25)', actionFg: '#FFFFFF' }
    : { fg: T.paper, row: T.s3, line: 'rgba(245,240,234,0.14)', lineStrong: 'rgba(245,240,234,0.30)', actionFg: T.ink };

  /* Solid pill = the one action that books. Hairline pill = everything else. */
  function Button({ children, variant = 'solid', theme: t = 'dark', href, ...rest }) {
    const c = theme(t);
    const [over, setOver] = React.useState(false);
    const base = {
      fontFamily: T.font, fontSize: 15, borderRadius: 999, display: 'inline-block',
      textDecoration: 'none', cursor: 'pointer', border: 'none',
      transition: `transform 500ms ${T.ease}, border-color 500ms ${T.ease}`
    };
    const style = variant === 'solid'
      ? { ...base, background: T.accent, color: c.actionFg, fontWeight: 400, padding: '17px 34px', transform: over ? 'translateY(-3px)' : 'none' }
      : { ...base, background: 'transparent', color: c.fg, fontWeight: 300, padding: '16px 30px', border: `1px solid ${over ? c.fg : c.lineStrong}` };
    return h(href ? 'a' : 'button', {
      href, style, onMouseEnter: () => setOver(true), onMouseLeave: () => setOver(false), ...rest
    }, children);
  }

  /* Time slot on the public page. Selected slot carries the accent. */
  function TimeSlot({ time, state = 'open', theme: t = 'dark', onClick }) {
    const c = theme(t);
    const style = {
      fontFamily: T.font, fontSize: 14, borderRadius: 999, padding: '10px 18px',
      border: `1px solid ${c.lineStrong}`, background: 'transparent', color: c.fg,
      cursor: state === 'taken' ? 'default' : 'pointer', opacity: state === 'taken' ? 0.4 : 1
    };
    if (state === 'selected') Object.assign(style, {
      background: T.accent, color: c.actionFg, border: 'none', padding: '11px 19px', fontWeight: 500
    });
    return h('button', { style, onClick, disabled: state === 'taken' }, time);
  }

  /* Cabinet schedule row. The pink bar means occupied; free time gets a dashed outline. */
  function ScheduleRow({ time, title, duration, free = false, theme: t = 'dark' }) {
    const c = theme(t);
    const grid = {
      display: 'grid', gridTemplateColumns: '3px 56px 1fr auto', gap: 14, alignItems: 'center',
      fontFamily: T.font, fontWeight: 300, color: c.fg
    };
    if (free) return h('div', { style: { ...grid, border: `1px dashed ${c.lineStrong}`, padding: '12px 13px 12px 0' } },
      h('span'),
      h('span', { style: { fontSize: 14, opacity: 0.6 } }, time),
      h('span', { style: { fontSize: 15, opacity: 0.5 } }, title || 'Свободно'),
      h('span', { style: { fontSize: 12, opacity: 0.45 } }, duration));
    return h('div', { style: { ...grid, background: c.row, padding: '13px 14px 13px 0' } },
      h('span', { style: { background: T.accent, alignSelf: 'stretch' } }),
      h('span', { style: { fontSize: 14, opacity: 0.6 } }, time),
      h('span', { style: { fontSize: 15 } }, title),
      h('span', { style: { fontSize: 12, opacity: 0.45 } }, duration));
  }

  /* The floating booking card — the only element in the system that carries a shadow. */
  function BookingCard({ at = '02:14', client, service, when, note = 'Подтверждено автоматически' }) {
    return h('div', { style: {
      width: 320, background: T.s2, color: T.paper, fontFamily: T.font, fontWeight: 300,
      padding: '26px 26px 22px', display: 'flex', flexDirection: 'column', gap: 18,
      boxShadow: '0 40px 90px rgba(0,0,0,0.65)'
    } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.55 } },
        h('span', { style: { width: 7, height: 7, borderRadius: 999, background: T.accent, flex: 'none' } }), 'Новая запись'),
      h('div', { style: { fontSize: 56, lineHeight: 0.9, letterSpacing: '-0.035em' } }, at),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 7, fontSize: 14 } },
        h('span', { style: { opacity: 0.8 } }, client),
        h('span', { style: { opacity: 0.55 } }, service),
        h('span', { style: { opacity: 0.55 } }, when)),
      h('div', { style: { height: 1, background: 'rgba(245,240,234,0.14)' } }),
      h('div', { style: { fontSize: 13, opacity: 0.5 } }, note));
  }

  /* Section head: display line left, supporting paragraph right, capped at 46ch. */
  function SectionHeading({ title, lede, theme: t = 'dark' }) {
    const c = theme(t);
    return h('div', { style: {
      display: 'flex', flexWrap: 'wrap', gap: 'clamp(32px, 6vw, 96px)',
      alignItems: 'flex-end', justifyContent: 'space-between', fontFamily: T.font, color: c.fg
    } },
      h('h2', { style: { margin: 0, fontWeight: 300, fontSize: 'clamp(2rem, 5.4vw, 4.6rem)', lineHeight: 0.94, letterSpacing: '-0.035em', textWrap: 'balance', maxWidth: '16ch' } }, title),
      lede && h('p', { style: { margin: 0, fontSize: 17, lineHeight: 1.6, fontWeight: 300, opacity: 0.7, maxWidth: '46ch', textWrap: 'pretty' } }, lede));
  }

  window.AMOLIE = { Button, TimeSlot, ScheduleRow, BookingCard, SectionHeading, tokens: T };
})();

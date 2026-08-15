(() => {
  const HOURS = [
    2, 1, 1, 1, 1, 2, 3, 5, 7, 8, 8, 7,
    6, 6, 7, 8, 10, 13, 17, 22, 27, 31, 24, 12
  ];
  const NIGHT = h => h >= 20 || h <= 5;
  const EASE = 'cubic-bezier(.22,1,.36,1)';
  const max = Math.max(...HOURS);
  const total = HOURS.reduce((a, b) => a + b, 0);

  class NightClock extends HTMLElement {
    connectedCallback() {
      if (this._built) return;
      this._built = true;
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <style>
          :host { display: block; font-family: 'Onest', system-ui, sans-serif; color: #F5F0EA; }
          .wrap { display: flex; flex-direction: column; gap: 26px; }
          .readout { display: flex; align-items: flex-end; gap: 22px; flex-wrap: wrap; min-height: 76px; }
          .time { font-size: clamp(44px, 6vw, 76px); line-height: 0.82; letter-spacing: -0.04em; font-weight: 300; font-variant-numeric: tabular-nums; }
          .meta { display: flex; flex-direction: column; gap: 5px; padding-bottom: 4px; }
          .share { font-size: 15px; font-weight: 300; opacity: 0.8; }
          .state { font-size: 13px; font-weight: 300; opacity: 0.5; }
          .strip { display: grid; grid-template-columns: repeat(24, 1fr); gap: clamp(3px, 0.5vw, 8px); align-items: end; height: clamp(120px, 18vh, 190px); cursor: crosshair; }
          .col { position: relative; height: 100%; display: flex; align-items: flex-end; }
          .bar { width: 100%; background: rgba(245,240,234,0.16); transition: background 420ms ${EASE}, transform 620ms ${EASE}; transform-origin: bottom; }
          .col[data-night="1"] .bar { background: rgba(245,240,234,0.28); }
          .col[data-on="1"] .bar { background: #E2568A; }
          .scale { display: grid; grid-template-columns: repeat(24, 1fr); gap: clamp(3px, 0.5vw, 8px); font-size: 11px; font-weight: 300; opacity: 0.4; font-variant-numeric: tabular-nums; }
          .scale span { text-align: center; }
          .caption { font-size: 13px; font-weight: 300; opacity: 0.45; }
          @media (max-width: 640px) { .scale span:nth-child(odd) { visibility: hidden; } }
          @media (prefers-reduced-motion: reduce) { .bar { transition: none; } }
        </style>
        <div class="wrap">
          <div class="readout">
            <div class="time" part="time">21:00</div>
            <div class="meta">
              <div class="share"></div>
              <div class="state"></div>
            </div>
          </div>
          <div class="strip" role="img" aria-label="Распределение записей по часам суток"></div>
          <div class="scale"></div>
          <div class="caption">Пример суточного распределения записей на публичной странице</div>
        </div>`;

      const strip = root.querySelector('.strip');
      const scale = root.querySelector('.scale');
      HOURS.forEach((v, h) => {
        const col = document.createElement('div');
        col.className = 'col';
        col.dataset.night = NIGHT(h) ? '1' : '0';
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = Math.round((v / max) * 100) + '%';
        col.appendChild(bar);
        strip.appendChild(col);
        const s = document.createElement('span');
        s.textContent = String(h).padStart(2, '0');
        scale.appendChild(s);
      });

      this._cols = [...strip.children];
      this._time = root.querySelector('.time');
      this._share = root.querySelector('.share');
      this._state = root.querySelector('.state');
      this._set(21);

      const pick = e => {
        const r = strip.getBoundingClientRect();
        const x = Math.min(Math.max(e.clientX - r.left, 0), r.width - 1);
        this._stop();
        this._set(Math.floor((x / r.width) * 24));
      };
      strip.addEventListener('pointermove', pick);
      strip.addEventListener('pointerdown', pick);

      this._i = 21;
      this._timer = setInterval(() => {
        this._i = (this._i + 1) % 24;
        this._set(this._i);
      }, 1100);
    }

    disconnectedCallback() { this._stop(); }
    _stop() { if (this._timer) { clearInterval(this._timer); this._timer = null; } }

    _set(h) {
      if (h === this._active) return;
      this._active = h;
      this._cols.forEach((c, i) => c.dataset.on = i === h ? '1' : '0');
      this._time.textContent = String(h).padStart(2, '0') + ':00';
      this._share.textContent = Math.round((HOURS[h] / total) * 100) + ' процентов записей за сутки';
      this._state.textContent = NIGHT(h)
        ? 'Мастер не отвечает. Страница отвечает'
        : 'Рабочие часы';
    }
  }

  if (!customElements.get('night-clock')) customElements.define('night-clock', NightClock);
})();

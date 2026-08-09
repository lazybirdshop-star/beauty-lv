/**
 * Заморозка wall-clock времени для `next start` в скриншот-харнессе
 * (BRAND_STYLE_ARCHITECTURE.md §16.2 — «механизм фиксации времени»).
 *
 * Подключается через `NODE_OPTIONS=--require …/freeze-time.cjs` и меняет
 * только безаргументный `new Date()` и `Date.now()` — разбор строк
 * (`new Date(iso)`) и `Date.parse` работают как обычно, поэтому маппинг
 * слотов из ISO в локальные дату/время остаётся честным.
 *
 * Браузерную половину времени замораживает Playwright (`page.clock`) —
 * обе стороны обязаны согласоваться, иначе SSR-разметка и гидратация
 * покажут разные «сегодня».
 */
const FIXED_MS = Date.parse(process.env.VISUAL_FIXED_NOW ?? '2026-02-09T12:00:00+02:00');

const NativeDate = Date;

class FrozenDate extends NativeDate {
  constructor(...args) {
    if (args.length === 0) {
      super(FIXED_MS);
    } else {
      super(...args);
    }
  }

  static now() {
    return FIXED_MS;
  }
}

globalThis.Date = FrozenDate;
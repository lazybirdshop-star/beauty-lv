/**
 * Money is always stored and passed around as minor units (cents), never as
 * a float, to avoid rounding errors in bookings and payments (see
 * DATABASE.md §1).
 */
export interface Money {
  readonly amountMinorUnits: number;
  readonly currency: string;
}

/**
 * Валюта, которой считается сумма, когда считать ещё нечего.
 *
 * Нужна ровно в одном случае: сводка просит `max(currency)` по снимкам цен, а
 * снимков нет — у мастера ни одного завершённого визита. Ноль всё равно
 * придётся чем-то подписать.
 *
 * Здесь, а не в каждом репозитории: строка `'EUR'` была написана в четырёх
 * местах двух модулей, и это ровно та константа, которая переживает продукт
 * первой — в день выхода за пределы еврозоны разъехались бы финансы и главная,
 * причём молча, каждая со своим мнением о деньгах мастера.
 */
export const DEFAULT_CURRENCY = 'EUR';

export function money(amountMinorUnits: number, currency: string): Money {
  if (!Number.isInteger(amountMinorUnits)) {
    throw new Error('Money amount must be an integer number of minor units');
  }
  return { amountMinorUnits, currency };
}

/**
 * Сумма словами денег — «45 €», а не «45,00 €».
 *
 * Целая сумма пишется без копеек, как её называют вслух и как она стоит в
 * прайсе (прототип «Кабинет 2026»); дробная — двумя знаками, как положено
 * валюте: «12,50 €», а не «12,5 €».
 */
export function formatMoney(value: Money, locale: string): string {
  const whole = value.amountMinorUnits % 100 === 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
    ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
  }).format(value.amountMinorUnits / 100);
}

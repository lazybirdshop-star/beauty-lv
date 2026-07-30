/**
 * Money is always stored and passed around as minor units (cents), never as
 * a float, to avoid rounding errors in bookings and payments (see
 * DATABASE.md §1).
 */
export interface Money {
  readonly amountMinorUnits: number;
  readonly currency: string;
}

export function money(amountMinorUnits: number, currency: string): Money {
  if (!Number.isInteger(amountMinorUnits)) {
    throw new Error('Money amount must be an integer number of minor units');
  }
  return { amountMinorUnits, currency };
}

export function formatMoney(value: Money, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
  }).format(value.amountMinorUnits / 100);
}

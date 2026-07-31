import { formatMoney, type Money } from '@beauty-lv/shared-kernel';

export function formatPrice(amountMinorUnits: number, currency = 'EUR'): string {
  return formatMoney({ amountMinorUnits, currency } satisfies Money, 'ru');
}

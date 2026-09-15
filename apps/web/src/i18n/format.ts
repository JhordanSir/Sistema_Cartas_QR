import { INTL_LOCALE, type Locale } from './locale';

/** Prices are always soles; only their presentation follows the interface language. */
export function formatCurrency(amount: number | string, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    currency: 'PEN',
    style: 'currency',
  }).format(Number(amount));
}

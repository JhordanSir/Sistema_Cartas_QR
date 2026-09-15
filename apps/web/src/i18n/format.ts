import { INTL_LOCALE, type Locale } from './locale';

/** Prices are always soles; only their presentation follows the interface language. */
export function formatCurrency(amount: number | string, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    currency: 'PEN',
    style: 'currency',
  }).format(Number(amount));
}

/** A calendar date in the interface language, in the viewer's own time zone. */
export function formatDate(value: Date | string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: 'medium' }).format(
    new Date(value),
  );
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(value);
}

/** "1 sección", "3 secciones": the noun follows the language's own plural rules. */
export function formatCount(
  count: number,
  locale: Locale,
  forms: { one: string; other: string },
): string {
  const form = new Intl.PluralRules(INTL_LOCALE[locale]).select(count) === 'one'
    ? forms.one
    : forms.other;
  return `${formatNumber(count, locale)} ${form}`;
}

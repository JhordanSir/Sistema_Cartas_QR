import { INTL_LOCALE, type Locale } from './locale';

/**
 * Builds each Intl formatter once per language. They are costly to create, and the
 * public menu formats every price, variant and add-on on each request.
 */
function perLocale<Formatter>(create: (tag: string) => Formatter): (locale: Locale) => Formatter {
  const cache = new Map<Locale, Formatter>();
  return (locale) => {
    let formatter = cache.get(locale);
    if (!formatter) {
      formatter = create(INTL_LOCALE[locale]);
      cache.set(locale, formatter);
    }
    return formatter;
  };
}

const currencyFormat = perLocale(
  (tag) => new Intl.NumberFormat(tag, { currency: 'PEN', style: 'currency' }),
);
// Created without a time zone, so it keeps the viewer's own, as formatDate promises.
const dateFormat = perLocale((tag) => new Intl.DateTimeFormat(tag, { dateStyle: 'medium' }));
const numberFormat = perLocale((tag) => new Intl.NumberFormat(tag));
const pluralRules = perLocale((tag) => new Intl.PluralRules(tag));
const collator = perLocale((tag) => new Intl.Collator(tag));
// fallback "none": an unknown code gives undefined instead of the code itself.
const regionNames = perLocale((tag) => new Intl.DisplayNames([tag], { fallback: 'none', type: 'region' }));
const languageNames = perLocale((tag) => new Intl.DisplayNames([tag], { fallback: 'none', type: 'language' }));

/** Prices are always soles; only their presentation follows the interface language. */
export function formatCurrency(amount: number | string, locale: Locale): string {
  return currencyFormat(locale).format(Number(amount));
}

/** A calendar date in the interface language, in the viewer's own time zone. */
export function formatDate(value: Date | string, locale: Locale): string {
  return dateFormat(locale).format(new Date(value));
}

export function formatNumber(value: number, locale: Locale): string {
  return numberFormat(locale).format(value);
}

/** "1 sección", "3 secciones": the noun follows the language's own plural rules. */
export function formatCount(
  count: number,
  locale: Locale,
  forms: { one: string; other: string },
): string {
  const form = pluralRules(locale).select(count) === 'one' ? forms.one : forms.other;
  return `${formatNumber(count, locale)} ${form}`;
}

/** Orders names as the interface language does: "Perú" right after "Paraguay". */
export function compareNames(left: string, right: string, locale: Locale): number {
  return collator(locale).compare(left, right);
}

/**
 * The browser's own name for an ISO 3166 country: "PE" → "Perú". Undefined when it
 * has none, so callers keep their fallback. Chrome ships no names for UN M.49 areas
 * such as "019", so continents come from the message tables instead.
 */
export function displayRegion(code: string, locale: Locale): string | undefined {
  try {
    return regionNames(locale).of(code);
  } catch {
    // A code that is not even well formed throws instead of returning undefined.
    return undefined;
  }
}

/** The browser's own name for an ISO 639 language: "qu" → "quechua". */
export function displayLanguage(code: string, locale: Locale): string | undefined {
  try {
    return languageNames(locale).of(code);
  } catch {
    return undefined;
  }
}

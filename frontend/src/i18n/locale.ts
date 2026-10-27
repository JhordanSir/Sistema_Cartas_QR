export const LOCALES = ['es', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';

/**
 * Written without Max-Age, so the choice lasts for the browser session and a new
 * session starts in Spanish again.
 */
export const LOCALE_COOKIE = 'sirio-locale';

/** BCP 47 tags passed to Intl. */
export const INTL_LOCALE: Record<Locale, string> = { en: 'en-US', es: 'es-PE' };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

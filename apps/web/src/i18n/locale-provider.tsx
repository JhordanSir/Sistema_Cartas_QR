'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { DEFAULT_LOCALE, type Locale } from './locale';

// Defaults to Spanish so a component rendered outside the provider, as in most unit
// tests, keeps the copy it always had.
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Mounted once by the root layout with the locale read from the cookie. */
export function LocaleProvider({ children, locale }: { children: ReactNode; locale: Locale }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Picks the current language out of a `{ es, en }` message table. */
export function useCopy<Messages>(messages: Record<Locale, Messages>): Messages {
  return messages[useLocale()];
}

import { cookies } from 'next/headers';

import { LOCALE_COOKIE, type Locale, resolveLocale } from './locale';

/**
 * Server Components and metadata read the language straight from the cookie, so the
 * HTML arrives already translated. Reading it makes the route render per request.
 */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
}

export async function getCopy<Messages>(messages: Record<Locale, Messages>): Promise<Messages> {
  return messages[await getLocale()];
}

import { cookies } from 'next/headers';

import { LOCALE_COOKIE, isLocale } from '@/i18n/locale';
import { invalidOriginResponse, isSameOrigin, problemResponse } from '@/lib/api-server';

/**
 * Stores the interface language. No Max-Age: the choice lasts for the browser
 * session. HttpOnly because only the server reads it; the client gets the language
 * from LocaleProvider.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return invalidOriginResponse();
  }

  let locale: unknown;
  try {
    locale = ((await request.json()) as { locale?: unknown }).locale;
  } catch {
    return problemResponse(400, 'Invalid request body', { code: 'REQUEST_INVALID' });
  }
  if (!isLocale(locale)) {
    return problemResponse(400, 'Invalid locale', { code: 'REQUEST_INVALID' });
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: (process.env.PUBLIC_APP_URL ?? '').startsWith('https://'),
  });
  return new Response(null, { status: 204 });
}

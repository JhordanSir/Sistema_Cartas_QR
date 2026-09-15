import { cookies } from 'next/headers';

import { LOCALE_COOKIE, isLocale } from '@/i18n/locale';
import { isSameOrigin } from '@/lib/api-server';

/**
 * Stores the interface language. No Max-Age: the choice lasts for the browser
 * session. HttpOnly because only the server reads it; the client gets the language
 * from LocaleProvider.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Response.json({ message: 'Invalid request origin' }, { status: 403 });
  }

  let locale: unknown;
  try {
    locale = ((await request.json()) as { locale?: unknown }).locale;
  } catch {
    return Response.json({ message: 'Invalid request body' }, { status: 400 });
  }
  if (!isLocale(locale)) {
    return Response.json({ message: 'Invalid locale' }, { status: 400 });
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

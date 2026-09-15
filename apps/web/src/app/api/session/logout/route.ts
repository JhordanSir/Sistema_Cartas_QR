import { cookies } from 'next/headers';

import {
  apiInternalUrl,
  clearSessionCookies,
  invalidOriginResponse,
  isSameOrigin,
} from '@/lib/api-server';

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return invalidOriginResponse();
  }
  const refreshToken = (await cookies()).get('sirio_refresh')?.value;
  if (refreshToken) {
    await fetch(`${apiInternalUrl()}/api/auth/logout`, {
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }).catch(() => undefined);
  }
  await clearSessionCookies();
  return new Response(null, { status: 204 });
}

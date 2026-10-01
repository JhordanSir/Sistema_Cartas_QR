import { z } from 'zod';

import { findAccountByEmail } from '@/server/accounts';
import { ApiError, handleApi, jsonResponse, readJsonBody } from '@/server/http';
import { clearSessionCookie, setSessionCookie } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';
import { verifyAgainstDummyHash, verifyPassword } from '@/server/password';
import { readSession, revokeSession, startSession } from '@/server/session';
import { hasErrors, validateLoginForm } from '@/shared/account-forms';
import { homePathFor } from '@/shared/routes';
import { normalizeEmail } from '@/shared/validation';

const LoginBody = z.object({
  email: z.string().max(1000),
  password: z.string().max(1000),
});

/** Always the same answer, so it never reveals which part was wrong (§E4). */
function invalidCredentials(): ApiError {
  return new ApiError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
}

export function POST(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const body = await readJsonBody(request, LoginBody);
    if (hasErrors(validateLoginForm(body))) throw invalidCredentials();

    const account = await findAccountByEmail(normalizeEmail(body.email));
    if (!account) {
      await verifyAgainstDummyHash(body.password);
      throw invalidCredentials();
    }
    const passwordMatches = await verifyPassword(body.password, account.passwordHash);
    if (!passwordMatches || !account.isActive) throw invalidCredentials();

    const session = await startSession(account.id);
    await setSessionCookie(session.token, session.expiresAt);
    return jsonResponse({ redirectTo: homePathFor(account) });
  });
}

/** Signs out: revokes the session (if any) and always clears the cookie. */
export function DELETE(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const session = await readSession(request.headers.get('cookie'));
    if (session) await revokeSession(session.id);
    await clearSessionCookie();
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  });
}

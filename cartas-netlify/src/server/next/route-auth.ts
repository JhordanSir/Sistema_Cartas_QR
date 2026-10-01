import { cookies } from 'next/headers';

import { ApiError } from '../http';
import { findRestaurantByOwner, type OwnerRestaurant } from '../restaurants';
import {
  readSession,
  renewSessionIfDue,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  type ActiveSession,
} from '../session';

// Authorization for Route Handlers. Next-specific (it writes cookies through
// next/headers), so Netlify Functions use ../session directly instead.

type AuthOptions = {
  /** Only changing the password and signing out work while it is pending (§E4). */
  allowPendingPasswordChange?: boolean;
};

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE_NAME, '', sessionCookieOptions(new Date(0)));
}

/** The session of the request, renewed (database and cookie) when it is due. */
export async function authenticate(request: Request, options: AuthOptions = {}): Promise<ActiveSession> {
  const session = await readSession(request.headers.get('cookie'));
  if (!session) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Tu sesión terminó. Vuelve a entrar.');
  }
  if (session.account.mustChangePassword && !options.allowPendingPasswordChange) {
    throw new ApiError(403, 'MUST_CHANGE_PASSWORD', 'Cambia tu contraseña para continuar.');
  }
  const renewedUntil = await renewSessionIfDue(session);
  if (!renewedUntil) return session;
  await setSessionCookie(session.token, renewedUntil);
  return { ...session, expiresAt: renewedUntil };
}

const FORBIDDEN_MESSAGE = 'No tienes acceso a esta sección.';

export async function requireOwner(
  request: Request,
  options: AuthOptions = {},
): Promise<{ session: ActiveSession; restaurant: OwnerRestaurant }> {
  const session = await authenticate(request, options);
  if (session.account.role !== 'OWNER') throw new ApiError(403, 'FORBIDDEN', FORBIDDEN_MESSAGE);
  const restaurant = await findRestaurantByOwner(session.account.id);
  if (!restaurant) throw new Error(`Owner account ${session.account.id} has no restaurant.`);
  return { restaurant, session };
}

export async function requireAdmin(request: Request, options: AuthOptions = {}): Promise<ActiveSession> {
  const session = await authenticate(request, options);
  if (session.account.role !== 'ADMIN') throw new ApiError(403, 'FORBIDDEN', FORBIDDEN_MESSAGE);
  return session;
}

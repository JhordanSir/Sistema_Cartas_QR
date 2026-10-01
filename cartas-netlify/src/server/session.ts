import { createHash, randomBytes } from 'node:crypto';

import { and, eq, gt, isNull, ne } from 'drizzle-orm';

import { getDb, type Executor } from '../../db/index';
import { accounts, sessions } from '../../db/schema';

// Sessions of §E4: a random token lives only in the browser's cookie; the
// database keeps its SHA-256, so a leaked table cannot be replayed as cookies.

export const SESSION_COOKIE_NAME = 'sirio_session';

const DAY_MS = 86_400_000;
export const SESSION_LIFETIME_MS = 7 * DAY_MS;
export const SESSION_RENEWAL_THRESHOLD_MS = 3 * DAY_MS;

/** 32 random bytes in base64url are always 43 characters of this alphabet. */
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type AccountRole = 'OWNER' | 'ADMIN';

export type SessionAccount = {
  id: string;
  email: string;
  role: AccountRole;
  mustChangePassword: boolean;
};

export type ActiveSession = {
  id: string;
  token: string;
  expiresAt: Date;
  account: SessionAccount;
};

export type IssuedSession = { token: string; expiresAt: Date };

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function digestSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Reads one cookie from a raw `Cookie` header. */
export function readCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(';')) {
    const separator = pair.indexOf('=');
    if (separator === -1) continue;
    if (pair.slice(0, separator).trim() === name) return pair.slice(separator + 1).trim();
  }
  return null;
}

/** A session is extended by another 7 days once it has less than 3 left. */
export function shouldRenewSession(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() - now.getTime() < SESSION_RENEWAL_THRESHOLD_MS;
}

export function sessionExpiry(now: Date): Date {
  return new Date(now.getTime() + SESSION_LIFETIME_MS);
}

export function sessionCookieOptions(expiresAt: Date, now = new Date()) {
  return {
    expires: expiresAt,
    httpOnly: true,
    maxAge: Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000)),
    path: '/',
    sameSite: 'lax' as const,
    secure: true,
  };
}

export async function startSession(
  accountId: string,
  executor: Executor = getDb(),
  now = new Date(),
): Promise<IssuedSession> {
  const token = createSessionToken();
  const expiresAt = sessionExpiry(now);
  await executor.insert(sessions).values({
    accountId,
    expiresAt,
    lastUsedAt: now,
    tokenDigest: digestSessionToken(token),
  });
  return { token, expiresAt };
}

/**
 * The only way to read a session (§E4): from the raw `Cookie` header, so the
 * layouts, the Route Handlers and the Background Function share it. Returns
 * null for a missing, malformed, expired or revoked token, or an inactive account.
 */
export async function readSession(
  cookieHeader: string | null,
  now = new Date(),
): Promise<ActiveSession | null> {
  const token = readCookieValue(cookieHeader, SESSION_COOKIE_NAME);
  if (!token || !SESSION_TOKEN_PATTERN.test(token)) return null;

  const [row] = await getDb()
    .select({
      accountId: accounts.id,
      email: accounts.email,
      expiresAt: sessions.expiresAt,
      id: sessions.id,
      mustChangePassword: accounts.mustChangePassword,
      role: accounts.role,
    })
    .from(sessions)
    .innerJoin(accounts, eq(accounts.id, sessions.accountId))
    .where(
      and(
        eq(sessions.tokenDigest, digestSessionToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
        eq(accounts.isActive, true),
      ),
    )
    .limit(1);
  if (!row) return null;

  return {
    account: {
      email: row.email,
      id: row.accountId,
      mustChangePassword: row.mustChangePassword,
      role: row.role,
    },
    expiresAt: row.expiresAt,
    id: row.id,
    token,
  };
}

/** Extends the session when it is due; returns the new expiry, or null if nothing changed. */
export async function renewSessionIfDue(session: ActiveSession, now = new Date()): Promise<Date | null> {
  if (!shouldRenewSession(session.expiresAt, now)) return null;
  const expiresAt = sessionExpiry(now);
  await getDb()
    .update(sessions)
    .set({ expiresAt, lastUsedAt: now })
    .where(and(eq(sessions.id, session.id), isNull(sessions.revokedAt)));
  return expiresAt;
}

export async function revokeSession(
  sessionId: string,
  executor: Executor = getDb(),
  now = new Date(),
): Promise<void> {
  await executor
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
}

/** After a password change: every session of the account except the one in use. */
export async function revokeOtherSessions(
  accountId: string,
  keepSessionId: string,
  executor: Executor = getDb(),
  now = new Date(),
): Promise<void> {
  await executor
    .update(sessions)
    .set({ revokedAt: now })
    .where(
      and(eq(sessions.accountId, accountId), ne(sessions.id, keepSessionId), isNull(sessions.revokedAt)),
    );
}

/** After a temporary password (§E12): every session of the account. */
export async function revokeAllSessions(
  accountId: string,
  executor: Executor = getDb(),
  now = new Date(),
): Promise<void> {
  await executor
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(eq(sessions.accountId, accountId), isNull(sessions.revokedAt)));
}

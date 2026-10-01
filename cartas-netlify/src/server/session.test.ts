import { describe, expect, it, vi } from 'vitest';

// The pure helpers never touch the database; the client is mocked so importing
// the module does not need NETLIFY_DB_URL.
vi.mock('../../db/index', () => ({ getDb: vi.fn() }));

import {
  createSessionToken,
  digestSessionToken,
  readCookieValue,
  SESSION_LIFETIME_MS,
  sessionCookieOptions,
  sessionExpiry,
  shouldRenewSession,
} from './session';

const DAY_MS = 86_400_000;

describe('createSessionToken', () => {
  it('genera 32 bytes aleatorios en base64url', () => {
    const token = createSessionToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    expect(createSessionToken()).not.toBe(token);
  });
});

describe('digestSessionToken', () => {
  it('es el SHA-256 en hexadecimal', () => {
    expect(digestSessionToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(digestSessionToken(createSessionToken())).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('readCookieValue', () => {
  it('encuentra la cookie entre otras', () => {
    expect(readCookieValue('tema=claro; sirio_session=abc_123-x; otra=1', 'sirio_session')).toBe(
      'abc_123-x',
    );
  });

  it('no confunde cookies con nombres parecidos', () => {
    expect(readCookieValue('xsirio_session=malo; sirio_session2=malo', 'sirio_session')).toBeNull();
  });

  it('devuelve null sin cabecera', () => {
    expect(readCookieValue(null, 'sirio_session')).toBeNull();
  });
});

describe('shouldRenewSession', () => {
  const now = new Date('2026-10-01T12:00:00Z');

  it('renueva cuando quedan menos de 3 días', () => {
    expect(shouldRenewSession(new Date(now.getTime() + 3 * DAY_MS - 1), now)).toBe(true);
  });

  it('no renueva con 3 días o más por delante', () => {
    expect(shouldRenewSession(new Date(now.getTime() + 3 * DAY_MS), now)).toBe(false);
    expect(shouldRenewSession(sessionExpiry(now), now)).toBe(false);
  });

  it('extiende la sesión 7 días desde ahora', () => {
    expect(sessionExpiry(now).getTime() - now.getTime()).toBe(SESSION_LIFETIME_MS);
    expect(SESSION_LIFETIME_MS).toBe(7 * DAY_MS);
  });
});

describe('sessionCookieOptions', () => {
  it('es HttpOnly, Secure, SameSite=Lax y de toda la web', () => {
    const now = new Date('2026-10-01T12:00:00Z');
    const options = sessionCookieOptions(sessionExpiry(now), now);

    expect(options).toMatchObject({ httpOnly: true, path: '/', sameSite: 'lax', secure: true });
    expect(options.maxAge).toBe(7 * 24 * 60 * 60);
  });

  it('caduca de inmediato al cerrar sesión', () => {
    expect(sessionCookieOptions(new Date(0)).maxAge).toBe(0);
  });
});

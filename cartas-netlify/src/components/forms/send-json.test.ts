import { afterEach, describe, expect, it, vi } from 'vitest';

import { GENERIC_ERROR_MESSAGE } from '@/shared/messages';

import { redirectTarget, sendJson } from './send-json';

describe('redirectTarget', () => {
  it('acepta solo rutas de este sitio', () => {
    expect(redirectTarget({ redirectTo: '/panel' })).toBe('/panel');
    expect(redirectTarget({ redirectTo: 'https://evil.example' })).toBe('/');
    expect(redirectTarget({ redirectTo: '//evil.example' })).toBe('/');
    expect(redirectTarget(null, '/entrar')).toBe('/entrar');
  });
});

describe('sendJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('devuelve el cuerpo de una respuesta correcta', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ redirectTo: '/panel' })));

    await expect(sendJson('/api/sesion', 'POST', { email: 'a@b.co' })).resolves.toEqual({
      data: { redirectTo: '/panel' },
      ok: true,
    });
  });

  it('entrega el error de la API tal cual', async () => {
    const body = { code: 'EMAIL_TAKEN', fields: { email: 'Ya existe.' }, message: 'Ya existe.' };
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(body, { status: 409 })));

    await expect(sendJson('/api/registro', 'POST', {})).resolves.toEqual({
      error: body,
      ok: false,
      status: 409,
    });
  });

  it('cambia un fallo de red o un cuerpo inesperado por el mensaje genérico', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(sendJson('/api/sesion', 'DELETE')).resolves.toMatchObject({
      error: { message: GENERIC_ERROR_MESSAGE },
      ok: false,
    });

    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 502 })));
    await expect(sendJson('/api/sesion', 'DELETE')).resolves.toMatchObject({
      error: { message: GENERIC_ERROR_MESSAGE },
      ok: false,
      status: 502,
    });
  });
});

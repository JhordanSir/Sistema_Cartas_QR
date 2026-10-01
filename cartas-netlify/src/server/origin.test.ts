import { describe, expect, it } from 'vitest';

import { ApiError } from './http';
import { assertSameOrigin, isSameOrigin, requestHost } from './origin';

describe('isSameOrigin', () => {
  it('acepta el mismo host, con o sin puerto', () => {
    expect(isSameOrigin('https://sirio-cartas.netlify.app', 'sirio-cartas.netlify.app')).toBe(true);
    expect(isSameOrigin('http://localhost:8888', 'localhost:8888')).toBe(true);
  });

  it.each([
    ['https://evil.example', 'sirio-cartas.netlify.app'],
    ['https://sirio-cartas.netlify.app.evil.example', 'sirio-cartas.netlify.app'],
    ['http://localhost:3000', 'localhost:8888'],
    ['null', 'localhost:8888'],
    ['no es una url', 'localhost:8888'],
  ])('rechaza el origen %s para el host %s', (origin, host) => {
    expect(isSameOrigin(origin, host)).toBe(false);
  });

  it('rechaza cuando falta el origen o el host', () => {
    expect(isSameOrigin(null, 'localhost:8888')).toBe(false);
    expect(isSameOrigin('http://localhost:8888', null)).toBe(false);
  });
});

describe('requestHost', () => {
  it('prefiere el primer x-forwarded-host del proxy', () => {
    const headers = new Headers({
      host: 'internal:3000',
      'x-forwarded-host': 'sirio-cartas.netlify.app, otro.example',
    });
    expect(requestHost(headers)).toBe('sirio-cartas.netlify.app');
  });

  it('usa host cuando no hay proxy', () => {
    expect(requestHost(new Headers({ host: 'localhost:8888' }))).toBe('localhost:8888');
  });
});

describe('assertSameOrigin', () => {
  const request = (origin?: string) =>
    new Request('http://localhost:8888/api/sesion', {
      headers: { host: 'localhost:8888', ...(origin ? { origin } : {}) },
      method: 'POST',
    });

  it('deja pasar una petición de la propia página', () => {
    expect(() => assertSameOrigin(request('http://localhost:8888'))).not.toThrow();
  });

  it('responde 403 a un origen ajeno o ausente', () => {
    for (const origin of ['https://evil.example', undefined]) {
      const error = (() => {
        try {
          assertSameOrigin(request(origin));
        } catch (caught) {
          return caught;
        }
        return null;
      })();
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ code: 'INVALID_ORIGIN', status: 403 });
    }
  });
});

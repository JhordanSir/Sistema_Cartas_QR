import { describe, expect, it } from 'vitest';

import { buildPublicMenuUrl, normalizePublicAppUrl } from './qr';

describe('normalizePublicAppUrl', () => {
  it.each([
    ['https://sirio-cartas.netlify.app', 'https://sirio-cartas.netlify.app'],
    ['https://sirio-cartas.netlify.app/', 'https://sirio-cartas.netlify.app'],
    ['  https://sirio-cartas.netlify.app//  ', 'https://sirio-cartas.netlify.app'],
    ['https://ejemplo.pe/cartas/', 'https://ejemplo.pe/cartas'],
    ['http://localhost:8888', 'http://localhost:8888'],
  ])('normaliza «%s»', (value, expected) => {
    expect(normalizePublicAppUrl(value)).toBe(expected);
  });

  it.each([undefined, '', '   ', 'sirio-cartas.netlify.app', 'ftp://sirio.pe', 'https://sirio.pe/?a=1'])(
    'trata «%s» como no configurada',
    (value) => {
      expect(normalizePublicAppUrl(value)).toBeNull();
    },
  );
});

describe('buildPublicMenuUrl', () => {
  it('une la dirección pública y el slug sin barras dobles', () => {
    expect(buildPublicMenuUrl('https://sirio-cartas.netlify.app', 'cevicheria-luna')).toBe(
      'https://sirio-cartas.netlify.app/cevicheria-luna',
    );
  });
});

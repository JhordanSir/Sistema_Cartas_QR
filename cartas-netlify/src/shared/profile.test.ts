import { describe, expect, it } from 'vitest';

import {
  isAllowedSocialUrl,
  normalizeProfile,
  parseProfileView,
  PROFILE_MESSAGES,
  socialUrlMessage,
  validatePhone,
  validateProfileForm,
  type ProfileValues,
} from './profile';

const empty: ProfileValues = {
  address: '',
  contactPhone: '',
  facebookUrl: '',
  instagramUrl: '',
  name: 'Cevichería Luna',
  tiktokUrl: '',
  whatsapp: '',
};

describe('validatePhone', () => {
  it.each(['+51 987 654 321', '987654321', '(01) 234-5678', ''])('acepta «%s»', (phone) => {
    expect(validatePhone(phone, 'error')).toBeNull();
  });

  it.each(['123456', 'abc defg', '+51 987 654 321 ext. 2', '98765432#'])('rechaza «%s»', (phone) => {
    expect(validatePhone(phone, 'error')).toBe('error');
  });
});

describe('isAllowedSocialUrl', () => {
  it.each([
    ['https://www.instagram.com/cevicherialuna', 'instagram'],
    ['https://instagram.com/cevicherialuna/', 'instagram'],
    ['https://fb.com/cevicherialuna', 'facebook'],
    ['https://www.facebook.com/profile.php?id=123', 'facebook'],
    ['https://www.tiktok.com/@cevicherialuna', 'tiktok'],
  ] as const)('acepta %s para %s', (url, network) => {
    expect(isAllowedSocialUrl(url, network)).toBe(true);
  });

  it.each([
    ['http://instagram.com/x', 'instagram'],
    ['https://evil.com/instagram.com', 'instagram'],
    ['https://instagram.com.evil.com/x', 'instagram'],
    ['https://usuario:clave@instagram.com/x', 'instagram'],
    ['https://instagram.com:8443/x', 'instagram'],
    ['https://www.instagram.com/', 'instagram'],
    ['https://www.instagram.com/x', 'facebook'],
    ['instagram.com/x', 'instagram'],
  ] as const)('rechaza %s para %s', (url, network) => {
    expect(isAllowedSocialUrl(url, network)).toBe(false);
  });
});

describe('validateProfileForm', () => {
  it('acepta un perfil solo con el nombre', () => {
    expect(validateProfileForm(empty)).toEqual({});
  });

  it('marca cada campo inválido con su mensaje', () => {
    expect(
      validateProfileForm({
        ...empty,
        address: 'x'.repeat(501),
        contactPhone: 'abc',
        instagramUrl: 'http://instagram.com/x',
        name: ' ',
        whatsapp: '12',
      }),
    ).toEqual({
      address: PROFILE_MESSAGES.address,
      contactPhone: PROFILE_MESSAGES.contactPhone,
      instagramUrl: socialUrlMessage('instagram'),
      name: 'Escribe el nombre del restaurante, de hasta 160 caracteres.',
      whatsapp: PROFILE_MESSAGES.whatsapp,
    });
  });
});

describe('normalizeProfile', () => {
  it('recorta, unifica espacios del nombre y guarda null en lo vacío', () => {
    expect(
      normalizeProfile({ ...empty, address: '  Av. Grau 123  ', name: '  Cevichería   Luna ', whatsapp: '   ' }),
    ).toEqual({
      address: 'Av. Grau 123',
      contactPhone: null,
      facebookUrl: null,
      instagramUrl: null,
      name: 'Cevichería Luna',
      tiktokUrl: null,
      whatsapp: null,
    });
  });
});

describe('parseProfileView', () => {
  const view = {
    address: null,
    contactPhone: null,
    facebookUrl: null,
    instagramUrl: 'https://www.instagram.com/luna',
    logoUrl: '/media/restaurants/x/logo/y',
    name: 'Cevichería Luna',
    publicUrl: 'https://sirio-cartas.netlify.app/cevicheria-luna',
    slug: 'cevicheria-luna',
    tiktokUrl: null,
    whatsapp: null,
  };

  it('acepta la respuesta de la API', () => {
    expect(parseProfileView({ profile: view })).toEqual(view);
  });

  it('rechaza formas inesperadas', () => {
    expect(parseProfileView(null)).toBeNull();
    expect(parseProfileView({ profile: { ...view, slug: 3 } })).toBeNull();
    expect(parseProfileView({ profile: { ...view, logoUrl: 7 } })).toBeNull();
  });
});

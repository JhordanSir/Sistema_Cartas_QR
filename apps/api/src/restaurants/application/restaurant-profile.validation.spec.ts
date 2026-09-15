import type { RestaurantApplicationError } from '../domain/restaurant.errors.js';
import {
  detectLogoContentType,
  normalizeRestaurantProfile,
  validateRestaurantLogo,
} from './restaurant-profile.validation.js';

describe('restaurant profile validation', () => {
  it('normalizes optional contact fields and approved social URLs', () => {
    expect(
      normalizeRestaurantProfile({
        address: '  Av. Principal 123  ',
        contactPhone: ' (01) 555-0123 ',
        facebookUrl: '',
        instagramUrl: 'https://instagram.com/sirio.pe',
        tiktokUrl: '   ',
        whatsapp: '+51 999 888 777',
      }),
    ).toEqual({
      address: 'Av. Principal 123',
      contactPhone: '(01) 555-0123',
      facebookUrl: null,
      instagramUrl: 'https://instagram.com/sirio.pe',
      tiktokUrl: null,
      whatsapp: '+51 999 888 777',
    });
  });

  it('rejects links that impersonate a supported social network', () => {
    expect(() =>
      normalizeRestaurantProfile({
        instagramUrl: 'https://evil.test/instagram.com/sirio',
      }),
    ).toThrow(
      'La URL no corresponde a la red social indicada o no usa HTTPS.',
    );
  });

  it('detects PNG, JPG and WebP by binary signature', () => {
    expect(detectLogoContentType(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe('image/png');
    expect(detectLogoContentType(Uint8Array.from([255, 216, 255, 0]))).toBe('image/jpeg');
    expect(detectLogoContentType(Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]))).toBe('image/webp');
  });

  it('rejects mismatched MIME declarations and oversized images', () => {
    expect(() =>
      validateRestaurantLogo({
        bytes: Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
        contentType: 'image/jpeg',
      }),
    ).toThrow('El logo debe ser un archivo PNG, JPG o WebP válido.');

    try {
      validateRestaurantLogo({
        bytes: new Uint8Array(2 * 1024 * 1024 + 1),
        contentType: 'image/png',
      });
      throw new Error('Expected validation failure');
    } catch (error) {
      expect(error).toMatchObject<Partial<RestaurantApplicationError>>({
        code: 'INVALID_LOGO',
      });
    }
  });

  it('attaches the problem the client translates for each rejection', () => {
    expect(
      problemOf(() =>
        normalizeRestaurantProfile({ instagramUrl: 'https://evil.test/instagram.com/sirio' }),
      ),
    ).toEqual({ code: 'SOCIAL_URL_MISMATCH', params: { network: 'instagram' } });
    expect(problemOf(() => normalizeRestaurantProfile({ tiktokUrl: 'tiktok.com/@sirio' }))).toEqual({
      code: 'SOCIAL_URL_INCOMPLETE',
      params: { network: 'tiktok' },
    });
    expect(problemOf(() => normalizeRestaurantProfile({ contactPhone: 'llámame' }))).toEqual({
      code: 'PROFILE_PHONE_INVALID',
    });
    expect(problemOf(() => normalizeRestaurantProfile({ whatsapp: 'abc-defg-hij' }))).toEqual({
      code: 'PROFILE_WHATSAPP_INVALID',
    });
    expect(problemOf(() => normalizeRestaurantProfile({ address: 'a'.repeat(501) }))).toEqual({
      code: 'PROFILE_FIELD_TOO_LONG',
      params: { field: 'address', max: 500 },
    });
    expect(
      problemOf(() =>
        validateRestaurantLogo({ bytes: new Uint8Array(2 * 1024 * 1024 + 1), contentType: 'image/png' }),
      ),
    ).toEqual({ code: 'LOGO_TOO_LARGE', params: { maxMb: 2 } });
    expect(
      problemOf(() =>
        validateRestaurantLogo({
          bytes: Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
          contentType: 'image/jpeg',
        }),
      ),
    ).toEqual({ code: 'LOGO_FORMAT_INVALID' });
  });
});

function problemOf(run: () => unknown): RestaurantApplicationError['problem'] {
  try {
    run();
  } catch (error) {
    return (error as RestaurantApplicationError).problem;
  }
  throw new Error('Expected validation failure');
}

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
});

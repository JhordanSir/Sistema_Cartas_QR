import { describe, expect, it } from 'vitest';

import { detectImageType } from './images';

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => new TextEncoder().encode(text);

describe('detectImageType', () => {
  it('reconoce PNG por su firma de 8 bytes', () => {
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00))).toBe(
      'image/png',
    );
  });

  it('reconoce JPEG por FF D8 FF', () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10))).toBe('image/jpeg');
  });

  it('reconoce WebP por RIFF y WEBP', () => {
    const webp = new Uint8Array([...ascii('RIFF'), 0x24, 0x00, 0x00, 0x00, ...ascii('WEBPVP8 ')]);
    expect(detectImageType(webp)).toBe('image/webp');
  });

  it('rechaza un archivo de texto renombrado a .png', () => {
    expect(detectImageType(ascii('Hola, no soy una imagen aunque me llame logo.png'))).toBeNull();
  });

  it('rechaza un RIFF que no es WebP y las firmas incompletas', () => {
    const wave = new Uint8Array([...ascii('RIFF'), 0x24, 0x00, 0x00, 0x00, ...ascii('WAVEfmt ')]);
    expect(detectImageType(wave)).toBeNull();
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47))).toBeNull();
    expect(detectImageType(bytes(0xff, 0xd8))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });
});

// Images of §E6. The server trusts only the binary signature, never the
// declared MIME type or the file extension.

export type ImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Value for the `accept` attribute of every image input. */
export const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

const MEGABYTE = 1024 * 1024;
export const LOGO_MAX_BYTES = 2 * MEGABYTE;
export const PRODUCT_IMAGE_MAX_BYTES = 4 * MEGABYTE;

/** Longest side after compressing a logo or a product image in the browser. */
export const IMAGE_MAX_SIDE = 1600;
export const JPEG_QUALITY = 0.85;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/** PNG, JPEG or WebP by their first bytes; anything else is null. */
export function detectImageType(bytes: Uint8Array): ImageMimeType | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return 'image/png';
  if (startsWith(bytes, JPEG_SIGNATURE)) return 'image/jpeg';
  if (startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8)) return 'image/webp';
  return null;
}

export function isImageMimeType(value: unknown): value is ImageMimeType {
  return value === 'image/jpeg' || value === 'image/png' || value === 'image/webp';
}

export const IMAGE_MESSAGES = {
  logoTooLarge: 'El logo debe pesar como máximo 2 MB.',
  logoType: 'El logo debe ser una imagen PNG, JPG o WebP.',
  unreadable: 'No pudimos leer esa imagen. Prueba con otra.',
} as const;

import { RestaurantApplicationError } from '../domain/restaurant.errors.js';
import type { RestaurantLogoUpload } from './ports/restaurant-services.js';
import type { UpdateRestaurantProfileRecord } from './ports/restaurant-profile.repository.js';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const PHONE_PATTERN = /^\+?[0-9 ()-]{7,32}$/;
const SOCIAL_HOSTS: Record<string, readonly string[]> = {
  facebookUrl: ['facebook.com', 'www.facebook.com', 'fb.com', 'www.fb.com'],
  instagramUrl: ['instagram.com', 'www.instagram.com'],
  tiktokUrl: ['tiktok.com', 'www.tiktok.com'],
};

export interface RestaurantProfileInput {
  address?: string;
  contactPhone?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  whatsapp?: string;
}

export function normalizeRestaurantProfile(
  input: RestaurantProfileInput,
): UpdateRestaurantProfileRecord {
  const contactPhone = optionalText(input.contactPhone, 32, 'contactPhone');
  const whatsapp = optionalText(input.whatsapp, 32, 'whatsapp');
  if (contactPhone && !PHONE_PATTERN.test(contactPhone)) {
    invalid('El teléfono contiene caracteres no permitidos.');
  }
  if (whatsapp && !PHONE_PATTERN.test(whatsapp)) {
    invalid('El WhatsApp contiene caracteres no permitidos.');
  }

  return {
    address: optionalText(input.address, 500, 'address'),
    contactPhone,
    facebookUrl: optionalSocialUrl(input.facebookUrl, 'facebookUrl'),
    instagramUrl: optionalSocialUrl(input.instagramUrl, 'instagramUrl'),
    tiktokUrl: optionalSocialUrl(input.tiktokUrl, 'tiktokUrl'),
    whatsapp,
  };
}

export function validateRestaurantLogo(logo: RestaurantLogoUpload): void {
  if (logo.bytes.byteLength === 0 || logo.bytes.byteLength > MAX_LOGO_BYTES) {
    invalidLogo('El logo debe pesar como máximo 2 MB.');
  }
  const detected = detectLogoContentType(logo.bytes);
  if (!detected || detected !== logo.contentType) {
    invalidLogo('El logo debe ser un archivo PNG, JPG o WebP válido.');
  }
}

export function detectLogoContentType(
  bytes: Uint8Array,
): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every(
      (value, index) => bytes[index] === value,
    )
  ) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

function optionalText(
  value: string | undefined,
  maximumLength: number,
  field: string,
): string | null {
  const normalized = value?.trim() ?? '';
  if (normalized.length > maximumLength) {
    invalid(`El campo ${field} supera el máximo permitido.`);
  }
  return normalized || null;
}

function optionalSocialUrl(
  value: string | undefined,
  field: keyof typeof SOCIAL_HOSTS,
): string | null {
  const normalized = optionalText(value, 2048, field);
  if (!normalized) return null;
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    invalid('Las redes sociales deben usar una URL completa.');
  }
  if (
    parsed.protocol !== 'https:' ||
    !(SOCIAL_HOSTS[field] ?? []).includes(parsed.hostname.toLowerCase())
  ) {
    invalid('La URL no corresponde a la red social indicada o no usa HTTPS.');
  }
  return parsed.toString();
}

function invalid(message: string): never {
  throw new RestaurantApplicationError('INVALID_INPUT', message);
}

function invalidLogo(message: string): never {
  throw new RestaurantApplicationError('INVALID_LOGO', message);
}

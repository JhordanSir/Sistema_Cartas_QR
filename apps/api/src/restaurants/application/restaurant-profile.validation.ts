import { UPLOAD_LIMITS, toMegabytes } from '@sirio/shared';
import type { ApiErrorParamMap, ApiProblem } from '@sirio/shared';

import { RestaurantApplicationError } from '../domain/restaurant.errors.js';
import type { RestaurantLogoUpload } from './ports/restaurant-services.js';
import type { UpdateRestaurantProfileRecord } from './ports/restaurant-profile.repository.js';

type ProfileField = ApiErrorParamMap['PROFILE_FIELD_TOO_LONG']['field'];
type SocialField = 'facebookUrl' | 'instagramUrl' | 'tiktokUrl';

const MAX_LOGO_BYTES = UPLOAD_LIMITS.logo.maximumBytes;

const PHONE_PATTERN = /^\+?[0-9 ()-]{7,32}$/;
const SOCIAL_HOSTS: Record<SocialField, readonly string[]> = {
  facebookUrl: ['facebook.com', 'www.facebook.com', 'fb.com', 'www.fb.com'],
  instagramUrl: ['instagram.com', 'www.instagram.com'],
  tiktokUrl: ['tiktok.com', 'www.tiktok.com'],
};
const SOCIAL_NETWORKS: Record<SocialField, ApiErrorParamMap['SOCIAL_URL_MISMATCH']['network']> = {
  facebookUrl: 'facebook',
  instagramUrl: 'instagram',
  tiktokUrl: 'tiktok',
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
    invalid('El teléfono contiene caracteres no permitidos.', { code: 'PROFILE_PHONE_INVALID' });
  }
  if (whatsapp && !PHONE_PATTERN.test(whatsapp)) {
    invalid('El WhatsApp contiene caracteres no permitidos.', {
      code: 'PROFILE_WHATSAPP_INVALID',
    });
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
    invalidLogo('El logo debe pesar como máximo 2 MB.', {
      code: 'LOGO_TOO_LARGE',
      params: { maxMb: toMegabytes(MAX_LOGO_BYTES) },
    });
  }
  const detected = detectLogoContentType(logo.bytes);
  if (!detected || detected !== logo.contentType) {
    invalidLogo('El logo debe ser un archivo PNG, JPG o WebP válido.', {
      code: 'LOGO_FORMAT_INVALID',
    });
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
  field: ProfileField,
): string | null {
  const normalized = value?.trim() ?? '';
  if (normalized.length > maximumLength) {
    invalid(`El campo ${field} supera el máximo permitido.`, {
      code: 'PROFILE_FIELD_TOO_LONG',
      params: { field, max: maximumLength },
    });
  }
  return normalized || null;
}

function optionalSocialUrl(value: string | undefined, field: SocialField): string | null {
  const normalized = optionalText(value, 2048, field);
  if (!normalized) return null;
  const network = SOCIAL_NETWORKS[field];
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    invalid('Las redes sociales deben usar una URL completa.', {
      code: 'SOCIAL_URL_INCOMPLETE',
      params: { network },
    });
  }
  if (
    parsed.protocol !== 'https:' ||
    !SOCIAL_HOSTS[field].includes(parsed.hostname.toLowerCase())
  ) {
    invalid('La URL no corresponde a la red social indicada o no usa HTTPS.', {
      code: 'SOCIAL_URL_MISMATCH',
      params: { network },
    });
  }
  return parsed.toString();
}

function invalid(message: string, problem: ApiProblem): never {
  throw new RestaurantApplicationError('INVALID_INPUT', message, { problem });
}

function invalidLogo(message: string, problem: ApiProblem): never {
  throw new RestaurantApplicationError('INVALID_LOGO', message, { problem });
}

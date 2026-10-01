import type { FieldErrors } from './account-forms';
import { collapseWhitespace, validateRestaurantName } from './validation';

// Restaurant profile rules of §E5, shared by the form and PATCH /api/perfil.

export const PHONE_PATTERN = /^\+?[0-9 ()-]{7,32}$/;
export const ADDRESS_MAX_LENGTH = 500;
export const SOCIAL_URL_MAX_LENGTH = 2048;

export const SOCIAL_NETWORKS = {
  facebook: { hosts: ['facebook.com', 'www.facebook.com', 'fb.com', 'www.fb.com'], label: 'Facebook' },
  instagram: { hosts: ['instagram.com', 'www.instagram.com'], label: 'Instagram' },
  tiktok: { hosts: ['tiktok.com', 'www.tiktok.com'], label: 'TikTok' },
} as const;

export type SocialNetwork = keyof typeof SOCIAL_NETWORKS;

export type ProfileValues = {
  name: string;
  contactPhone: string;
  whatsapp: string;
  address: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
};

/** What gets stored: trimmed text, and null for every empty optional field. */
export type ProfileFields = {
  name: string;
  contactPhone: string | null;
  whatsapp: string | null;
  address: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
};

export const PROFILE_MESSAGES = {
  address: 'La dirección puede tener hasta 500 caracteres.',
  contactPhone: 'Escribe un teléfono válido, por ejemplo +51 987 654 321.',
  whatsapp: 'Escribe un número de WhatsApp válido, por ejemplo +51 987 654 321.',
} as const;

export function socialUrlMessage(network: SocialNetwork): string {
  const { hosts, label } = SOCIAL_NETWORKS[network];
  return `Pega el enlace completo de tu perfil de ${label}, por ejemplo https://${hosts[1]}/turestaurante.`;
}

/** Empty is valid: the phone is optional. */
export function validatePhone(value: string, message: string): string | null {
  const phone = value.trim();
  return phone === '' || PHONE_PATTERN.test(phone) ? null : message;
}

/** A full https:// address of the network's own host, pointing to a profile. */
export function isAllowedSocialUrl(value: string, network: SocialNetwork): boolean {
  if (value.length > SOCIAL_URL_MAX_LENGTH) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const hosts: readonly string[] = SOCIAL_NETWORKS[network].hosts;
  return (
    url.protocol === 'https:' &&
    url.username === '' &&
    url.password === '' &&
    url.port === '' &&
    hosts.includes(url.hostname) &&
    url.pathname.length > 1
  );
}

function validateSocialUrl(value: string, network: SocialNetwork): string | null {
  const url = value.trim();
  return url === '' || isAllowedSocialUrl(url, network) ? null : socialUrlMessage(network);
}

export function validateProfileForm(values: ProfileValues): FieldErrors<keyof ProfileValues> {
  const errors: FieldErrors<keyof ProfileValues> = {};
  const checks: [keyof ProfileValues, string | null][] = [
    ['name', validateRestaurantName(values.name)],
    ['contactPhone', validatePhone(values.contactPhone, PROFILE_MESSAGES.contactPhone)],
    ['whatsapp', validatePhone(values.whatsapp, PROFILE_MESSAGES.whatsapp)],
    ['address', [...values.address.trim()].length > ADDRESS_MAX_LENGTH ? PROFILE_MESSAGES.address : null],
    ['instagramUrl', validateSocialUrl(values.instagramUrl, 'instagram')],
    ['facebookUrl', validateSocialUrl(values.facebookUrl, 'facebook')],
    ['tiktokUrl', validateSocialUrl(values.tiktokUrl, 'tiktok')],
  ];
  for (const [field, message] of checks) {
    if (message) errors[field] = message;
  }
  return errors;
}

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function normalizeProfile(values: ProfileValues): ProfileFields {
  return {
    address: optional(values.address),
    contactPhone: optional(values.contactPhone),
    facebookUrl: optional(values.facebookUrl),
    instagramUrl: optional(values.instagramUrl),
    name: collapseWhitespace(values.name),
    tiktokUrl: optional(values.tiktokUrl),
    whatsapp: optional(values.whatsapp),
  };
}

/** What the panel and GET/PATCH /api/perfil show. */
export type ProfileView = ProfileFields & {
  slug: string;
  logoUrl: string | null;
  publicUrl: string | null;
};

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

/** The `profile` of an API response, or null if it does not have the expected shape. */
export function parseProfileView(data: unknown): ProfileView | null {
  if (typeof data !== 'object' || data === null || !('profile' in data)) return null;
  const { profile } = data;
  if (typeof profile !== 'object' || profile === null) return null;
  const record = profile as Record<string, unknown>;
  const nullable = [
    'address',
    'contactPhone',
    'facebookUrl',
    'instagramUrl',
    'logoUrl',
    'publicUrl',
    'tiktokUrl',
    'whatsapp',
  ];
  if (typeof record.name !== 'string' || typeof record.slug !== 'string') return null;
  if (!nullable.every((key) => isStringOrNull(record[key]))) return null;
  return record as ProfileView;
}

/** The form starts from what is stored; empty optional fields become ''. */
export function profileFormValues(profile: ProfileFields): ProfileValues {
  return {
    address: profile.address ?? '',
    contactPhone: profile.contactPhone ?? '',
    facebookUrl: profile.facebookUrl ?? '',
    instagramUrl: profile.instagramUrl ?? '',
    name: profile.name,
    tiktokUrl: profile.tiktokUrl ?? '',
    whatsapp: profile.whatsapp ?? '',
  };
}

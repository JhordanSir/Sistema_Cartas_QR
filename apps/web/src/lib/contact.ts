/**
 * Owners type their WhatsApp number however they like: "+51 999 999 999",
 * "(01) 555-0123", "51999999999". wa.me only accepts digits with the country code,
 * so the value is normalised here rather than trusted as written.
 */
const PERU_COUNTRY_CODE = '51';
const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

export function whatsappHref(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null;

  // A bare Peruvian mobile (9 digits starting with 9) needs its country code.
  const normalized =
    digits.length === 9 && digits.startsWith('9') ? `${PERU_COUNTRY_CODE}${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

export function telHref(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null;
  return `tel:${trimmed.startsWith('+') ? '+' : ''}${digits}`;
}

export interface SocialLink {
  href: string;
  label: string;
}

/**
 * Only https links survive, which matches what the API accepts when the owner saves
 * the profile. Anything else is dropped instead of rendered as a broken link.
 */
export function socialLinks(profile: {
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
}): SocialLink[] {
  return [
    { href: profile.instagramUrl, label: 'Instagram' },
    { href: profile.facebookUrl, label: 'Facebook' },
    { href: profile.tiktokUrl, label: 'TikTok' },
  ].flatMap(({ href, label }) =>
    href && href.startsWith('https://') ? [{ href, label }] : [],
  );
}

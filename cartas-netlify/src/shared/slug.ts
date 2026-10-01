const COMBINING_MARKS = /\p{Mark}+/gu;
const NON_ALPHANUMERIC = /[^\p{Letter}\p{Number}]+/gu;
const EDGE_HYPHENS = /^-+|-+$/g;

/** Paths the app owns: a restaurant can never take them as its public address. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'admin',
  'api',
  'assets',
  'auth',
  'backoffice',
  'cuenta',
  'entrar',
  'favicon',
  'favicon-ico',
  'health',
  'login',
  'logout',
  'media',
  'next',
  'panel',
  'register',
  'registro',
  'robots',
  'robots-txt',
  'salir',
  'sitemap',
  'sitemap-xml',
  'static',
  'uploads',
]);

/** "Cevichería Luna" → "cevicheria-luna": accents dropped, anything else becomes a hyphen. */
export function normalizeSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(NON_ALPHANUMERIC, '-')
    .replace(EDGE_HYPHENS, '');
}

export function isReservedSlug(value: string): boolean {
  return RESERVED_SLUGS.has(normalizeSlug(value));
}

export class EmptySlugError extends Error {
  constructor() {
    super('The name has no letters or numbers to build a slug from.');
    this.name = 'EmptySlugError';
  }
}

/**
 * The slug for a new restaurant: the normalized name, or the first free "-2", "-3"…
 * variant when it is reserved or already taken. The caller decides what "taken" means.
 */
export async function resolveUniqueSlug(
  name: string,
  slugExists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = normalizeSlug(name);
  if (!base) throw new EmptySlugError();

  let candidate = base;
  for (let suffix = 2; RESERVED_SLUGS.has(candidate) || (await slugExists(candidate)); suffix += 1) {
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

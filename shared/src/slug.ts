const COMBINING_MARKS_PATTERN = /\p{Mark}+/gu;
const NON_ALPHANUMERIC_PATTERN = /[^\p{Letter}\p{Number}]+/gu;
const EDGE_HYPHENS_PATTERN = /^-+|-+$/g;

export const RESERVED_SLUGS = Object.freeze([
  "admin",
  "api",
  "assets",
  "auth",
  "backoffice",
  "favicon",
  "favicon-ico",
  "health",
  "login",
  "logout",
  "next",
  "register",
  "robots",
  "robots-txt",
  "sitemap",
  "sitemap-xml",
  "static",
  "uploads"
] as const);

const RESERVED_SLUG_SET: ReadonlySet<string> = new Set(RESERVED_SLUGS);

export type SlugExists = (candidate: string) => Promise<boolean>;

export function normalizeSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(COMBINING_MARKS_PATTERN, "")
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_PATTERN, "-")
    .replace(EDGE_HYPHENS_PATTERN, "");
}

export function isReservedSlug(value: string): boolean {
  return RESERVED_SLUG_SET.has(normalizeSlug(value));
}

export async function resolveUniqueSlug(
  value: string,
  slugExists: SlugExists
): Promise<string> {
  const baseSlug = normalizeSlug(value);

  if (baseSlug.length === 0) {
    throw new TypeError("Cannot generate a slug without letters or numbers.");
  }

  let candidate = baseSlug;
  let nextSuffix = 2;

  while (isReservedSlug(candidate) || (await slugExists(candidate))) {
    candidate = `${baseSlug}-${nextSuffix}`;
    nextSuffix += 1;
  }

  return candidate;
}

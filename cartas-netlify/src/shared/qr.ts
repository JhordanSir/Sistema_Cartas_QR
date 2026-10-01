// Content of the QR (§E9): the public address of the menu, fixed forever.

/**
 * PUBLIC_APP_URL as a base without trailing slash, or null when it is missing
 * or is not an absolute http(s) address.
 */
export function normalizePublicAppUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.search || url.hash || url.username || url.password) return null;
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
}

export function buildPublicMenuUrl(publicAppUrl: string, slug: string): string {
  return `${publicAppUrl}/${slug}`;
}

export const QR_NOT_CONFIGURED_MESSAGE =
  'La dirección pública aún no está configurada. Avisa al administrador.';

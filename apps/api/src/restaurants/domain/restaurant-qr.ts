import type { RestaurantQrFormat } from './restaurant.types.js';

export const RESTAURANT_QR_FORMATS: readonly RestaurantQrFormat[] = ['png', 'svg'];

export function buildPublicRestaurantUrl(publicOrigin: string, slug: string): string {
  const origin = new URL(publicOrigin).origin;
  return `${origin}/${encodeURIComponent(slug)}`;
}

export function restaurantQrFileName(slug: string, format: RestaurantQrFormat): string {
  return `${slug}-qr.${format}`;
}

export function restaurantQrDownloadDisposition(fileName: string): string {
  const extension = fileName.includes('.')
    ? fileName.slice(fileName.lastIndexOf('.'))
    : '';
  const asciiCandidate = fileName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const fallback = asciiCandidate && asciiCandidate !== extension
    ? asciiCandidate
    : `restaurant-qr${extension}`;
  const encoded = encodeURIComponent(fileName).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

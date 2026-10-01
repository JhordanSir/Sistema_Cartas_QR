import { PUBLIC_IMAGE_KEY_PATTERN, readImage } from '@/server/blobs';

const IMMUTABLE = 'public, max-age=31536000, immutable';

function notFound(): Response {
  return new Response('Not found', {
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
    status: 404,
  });
}

/**
 * Logos and product images (§E6). Only `restaurants/…` image keys are served;
 * digitization photos and any other key answer 404. Keys carry a fresh UUID on
 * every upload, so a served image never changes and is cached for a year.
 */
export async function GET(_request: Request, context: RouteContext<'/media/[...key]'>): Promise<Response> {
  const { key: segments } = await context.params;
  const key = segments.join('/');
  if (!PUBLIC_IMAGE_KEY_PATTERN.test(key)) return notFound();

  const image = await readImage(key);
  if (!image) return notFound();

  return new Response(image.data, {
    headers: {
      'Cache-Control': IMMUTABLE,
      'Content-Type': image.contentType,
      'Netlify-CDN-Cache-Control': IMMUTABLE,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

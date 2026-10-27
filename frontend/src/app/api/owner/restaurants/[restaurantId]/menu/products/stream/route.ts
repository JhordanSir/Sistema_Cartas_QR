import { authenticatedApiFetch, proxyApiStream } from '@/lib/api-server';

export async function GET(
  request: Request,
  context: { params: Promise<{ restaurantId: string }> },
): Promise<Response> {
  const { restaurantId } = await context.params;
  const delayMs = new URL(request.url).searchParams.get('delayMs');
  const query = delayMs === null ? '' : `?delayMs=${encodeURIComponent(delayMs)}`;
  return proxyApiStream(
    await authenticatedApiFetch(
      `/api/owner/restaurants/${encodeURIComponent(restaurantId)}/menu/products/stream${query}`,
      // Next aborts this signal when the browser goes away; passing it on cuts
      // the request to the API too, which then stops reading the database.
      { signal: request.signal },
      'OWNER',
    ),
  );
}

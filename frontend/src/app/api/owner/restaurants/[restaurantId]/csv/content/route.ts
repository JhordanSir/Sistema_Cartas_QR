import { authenticatedApiFetch, proxyApiStream } from '@/lib/api-server';

/**
 * The saved CSV's bytes, passed on as they arrive: the page's worker fetches this
 * and parses while it downloads.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ restaurantId: string }> },
): Promise<Response> {
  const { restaurantId } = await context.params;
  return proxyApiStream(
    await authenticatedApiFetch(
      `/api/owner/restaurants/${encodeURIComponent(restaurantId)}/csv/content`,
      // Cancelling in the worker cuts the API's read of the file as well.
      { signal: request.signal },
      'OWNER',
    ),
  );
}

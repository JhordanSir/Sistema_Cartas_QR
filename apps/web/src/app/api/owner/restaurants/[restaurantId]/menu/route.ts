import {
  authenticatedApiFetch,
  proxyApiResponse,
} from '@/lib/api-server';

export async function GET(
  _request: Request,
  context: { params: Promise<{ restaurantId: string }> },
): Promise<Response> {
  const { restaurantId } = await context.params;
  return proxyApiResponse(
    await authenticatedApiFetch(
      `/api/owner/restaurants/${encodeURIComponent(restaurantId)}/menu`,
      {},
      'OWNER',
    ),
  );
}

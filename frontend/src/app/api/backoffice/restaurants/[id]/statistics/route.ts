import { authenticatedApiFetch, proxyApiResponse } from '@/lib/api-server';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return proxyApiResponse(
    await authenticatedApiFetch(
      `/api/backoffice/restaurants/${encodeURIComponent(id)}/statistics`,
    ),
  );
}

import { apiInternalUrl, proxyApiResponse } from '@/lib/api-server';

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await context.params;
  const response = await fetch(
    `${apiInternalUrl()}/api/restaurants/public/${encodeURIComponent(slug)}/logo`,
    { cache: 'no-store' },
  );
  return proxyApiResponse(response);
}

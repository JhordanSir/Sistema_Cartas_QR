import { apiInternalUrl, proxyApiResponse } from '@/lib/api-server';

export async function GET(
  _request: Request,
  context: { params: Promise<{ productId: string; slug: string }> },
): Promise<Response> {
  const { productId, slug } = await context.params;
  const response = await fetch(
    `${apiInternalUrl()}/api/restaurants/public/${encodeURIComponent(slug)}/products/${encodeURIComponent(productId)}/image`,
    { cache: 'no-store' },
  );
  return proxyApiResponse(response);
}

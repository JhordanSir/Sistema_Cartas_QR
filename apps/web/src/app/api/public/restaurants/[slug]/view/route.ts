import { apiInternalUrl, invalidOriginResponse, isSameOrigin, proxyApiResponse } from '@/lib/api-server';

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) {
    return invalidOriginResponse();
  }
  const { slug } = await context.params;
  const visitorIp = readVisitorIp(request);
  const upstream = await fetch(
    `${apiInternalUrl()}/api/restaurants/public/${encodeURIComponent(slug)}/view`,
    {
      cache: 'no-store',
      headers: visitorIp ? { 'x-sirio-visitor-ip': visitorIp } : undefined,
      method: 'POST',
    },
  );
  return proxyApiResponse(upstream);
}

function readVisitorIp(request: Request): string | null {
  for (const name of ['cf-connecting-ip', 'x-forwarded-for', 'x-real-ip']) {
    const value = request.headers.get(name)?.split(',')[0]?.trim();
    if (value) return value;
  }
  return null;
}

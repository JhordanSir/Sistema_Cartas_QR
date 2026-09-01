import {
  authenticatedApiFetch,
  proxyApiResponse,
} from '@/lib/api-server';

const QR_FORMATS = new Set(['png', 'svg']);

export async function GET(
  request: Request,
  context: { params: Promise<{ format: string; restaurantId: string }> },
): Promise<Response> {
  const { format, restaurantId } = await context.params;
  if (!QR_FORMATS.has(format)) {
    return Response.json({ message: 'Unsupported QR format' }, { status: 400 });
  }
  const download = new URL(request.url).searchParams.get('download') === 'true';
  return proxyApiResponse(
    await authenticatedApiFetch(
      `/api/owner/restaurants/${encodeURIComponent(restaurantId)}/qr/${format}${download ? '?download=true' : ''}`,
      {},
      'OWNER',
    ),
  );
}

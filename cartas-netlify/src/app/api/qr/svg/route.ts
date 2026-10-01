import { handleApi } from '@/server/http';
import { requireRestaurantQr } from '@/server/next/owner-qr';

export function GET(request: Request): Promise<Response> {
  return handleApi(async () => {
    const { qr, slug } = await requireRestaurantQr(request);
    return new Response(qr.svg, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="qr-${slug}.svg"`,
        'Content-Type': 'image/svg+xml; charset=utf-8',
      },
    });
  });
}

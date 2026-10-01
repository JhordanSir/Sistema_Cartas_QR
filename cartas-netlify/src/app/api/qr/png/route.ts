import { handleApi } from '@/server/http';
import { requireRestaurantQr } from '@/server/next/owner-qr';

export function GET(request: Request): Promise<Response> {
  return handleApi(async () => {
    const { qr, slug } = await requireRestaurantQr(request);
    return new Response(new Uint8Array(qr.png), {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="qr-${slug}.png"`,
        'Content-Type': 'image/png',
      },
    });
  });
}

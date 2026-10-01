import { handleApi, jsonResponse } from '@/server/http';
import { requireRestaurantQr } from '@/server/next/owner-qr';

/** The public address and the SVG of the owner's QR, generated only once (§E9). */
export function GET(request: Request): Promise<Response> {
  return handleApi(async () => {
    const { qr } = await requireRestaurantQr(request);
    return jsonResponse({ svg: qr.svg, url: qr.payload });
  });
}

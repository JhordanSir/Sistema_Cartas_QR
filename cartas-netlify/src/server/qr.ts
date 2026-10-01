import { and, eq, isNull } from 'drizzle-orm';
import QRCode from 'qrcode';

import { getDb } from '../../db/index';
import { restaurants } from '../../db/schema';
import { buildPublicMenuUrl, normalizePublicAppUrl } from '../shared/qr';

// QR of §E9: generated the first time the owner needs it and never again.
// Error correction H, margin 4, 512 px; the SVG uses the same options.
const QR_OPTIONS = { errorCorrectionLevel: 'H', margin: 4, width: 512 } as const;

export type RestaurantQr = { payload: string; png: Buffer; svg: string };

async function readQr(restaurantId: string): Promise<RestaurantQr | null> {
  const [row] = await getDb()
    .select({ payload: restaurants.qrPayload, png: restaurants.qrPng, svg: restaurants.qrSvg })
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId))
    .limit(1);
  if (!row?.payload || !row.png || !row.svg) return null;
  return { payload: row.payload, png: row.png, svg: row.svg };
}

/**
 * The stored QR, or a new one when the three columns are still empty. Returns
 * null only when it was never generated and PUBLIC_APP_URL is not configured.
 * The conditional UPDATE makes concurrent first visits agree on a single QR.
 */
export async function ensureRestaurantQr(restaurantId: string, slug: string): Promise<RestaurantQr | null> {
  const existing = await readQr(restaurantId);
  if (existing) return existing;

  const publicAppUrl = normalizePublicAppUrl(process.env.PUBLIC_APP_URL);
  if (!publicAppUrl) return null;

  const payload = buildPublicMenuUrl(publicAppUrl, slug);
  const [png, svg] = await Promise.all([
    QRCode.toBuffer(payload, { ...QR_OPTIONS, type: 'png' }),
    QRCode.toString(payload, { ...QR_OPTIONS, type: 'svg' }),
  ]);
  await getDb()
    .update(restaurants)
    .set({ qrPayload: payload, qrPng: png, qrSvg: svg })
    .where(
      and(
        eq(restaurants.id, restaurantId),
        isNull(restaurants.qrPayload),
        isNull(restaurants.qrPng),
        isNull(restaurants.qrSvg),
      ),
    );
  return readQr(restaurantId);
}

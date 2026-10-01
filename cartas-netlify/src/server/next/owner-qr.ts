import { QR_NOT_CONFIGURED_MESSAGE } from '../../shared/qr';
import { ApiError } from '../http';
import { ensureRestaurantQr, type RestaurantQr } from '../qr';
import { requireOwner } from './route-auth';

/** The owner's QR, generated on first use (§E9). Shared by the three QR routes. */
export async function requireRestaurantQr(
  request: Request,
): Promise<{ qr: RestaurantQr; slug: string }> {
  const { restaurant } = await requireOwner(request);
  const qr = await ensureRestaurantQr(restaurant.id, restaurant.slug);
  if (!qr) throw new ApiError(503, 'PUBLIC_URL_NOT_CONFIGURED', QR_NOT_CONFIGURED_MESSAGE);
  return { qr, slug: restaurant.slug };
}

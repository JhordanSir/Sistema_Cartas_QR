import QRCode from 'qrcode';

import type { RestaurantQrRenderer } from '../application/ports/restaurant-services.js';
import type { RestaurantQrFormat } from '../domain/restaurant.types.js';

const QR_OPTIONS = {
  color: {
    dark: '#17271EFF',
    light: '#FFFFFFFF',
  },
  errorCorrectionLevel: 'H' as const,
  margin: 4,
  width: 512,
};

export class NodeQrCodeRenderer implements RestaurantQrRenderer {
  async render(payload: string, format: RestaurantQrFormat): Promise<Uint8Array> {
    if (format === 'png') {
      return QRCode.toBuffer(payload, { ...QR_OPTIONS, type: 'png' });
    }
    return Buffer.from(
      await QRCode.toString(payload, { ...QR_OPTIONS, type: 'svg' }),
      'utf8',
    );
  }
}

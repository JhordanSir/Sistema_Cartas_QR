import { AuthRole } from '../../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import { RestaurantApplicationError } from '../../domain/restaurant.errors.js';
import {
  buildPublicRestaurantUrl,
  restaurantQrFileName,
} from '../../domain/restaurant-qr.js';
import type {
  RestaurantQrDocument,
  RestaurantQrFormat,
  RestaurantQrIdentity,
} from '../../domain/restaurant.types.js';
import type {
  RestaurantQrRepository,
  StoredRestaurantQr,
} from '../ports/restaurant-qr.repository.js';
import type { RestaurantQrRenderer } from '../ports/restaurant-services.js';

type MaterializedRestaurantQr = StoredRestaurantQr & {
  qrPayload: string;
  qrPng: Uint8Array;
  qrSvg: Uint8Array;
};

function isMaterializedQr(
  qr: StoredRestaurantQr,
): qr is MaterializedRestaurantQr {
  return qr.qrPayload !== null && qr.qrPng !== null && qr.qrSvg !== null;
}

export class GenerateRestaurantQr {
  constructor(
    private readonly repository: RestaurantQrRepository,
    private readonly renderer: RestaurantQrRenderer,
    private readonly publicOrigin: string,
  ) {}

  async execute(input: {
    format: RestaurantQrFormat;
    principal: AuthPrincipal;
    restaurantId: string;
  }): Promise<RestaurantQrDocument> {
    const qr = await this.resolveQr(input.principal, input.restaurantId);
    const bytes = input.format === 'png' ? qr.qrPng : qr.qrSvg;
    return {
      bytes,
      contentType: input.format === 'png' ? 'image/png' : 'image/svg+xml',
      fileName: restaurantQrFileName(qr.slug, input.format),
      publicUrl: qr.qrPayload,
    };
  }

  async getIdentity(input: {
    principal: AuthPrincipal;
    restaurantId: string;
  }): Promise<RestaurantQrIdentity> {
    const qr = await this.resolveQr(input.principal, input.restaurantId);
    return { publicUrl: qr.qrPayload, slug: qr.slug };
  }

  private async resolveQr(
    principal: AuthPrincipal,
    restaurantId: string,
  ): Promise<MaterializedRestaurantQr> {
    if (principal.role !== AuthRole.OWNER) {
      throw new RestaurantApplicationError('FORBIDDEN', 'Owner access required');
    }
    const existing = await this.repository.findQrForOwner(
      principal.accountId,
      restaurantId,
    );
    if (!existing) {
      throw new RestaurantApplicationError(
        'RESTAURANT_NOT_FOUND',
        'Restaurant QR not found',
      );
    }
    if (isMaterializedQr(existing)) return existing;

    const qrPayload = existing.qrPayload
      ?? buildPublicRestaurantUrl(this.publicOrigin, existing.slug);
    const [qrPng, qrSvg] = await Promise.all([
      this.renderer.render(qrPayload, 'png'),
      this.renderer.render(qrPayload, 'svg'),
    ]);
    const stored = await this.repository.storeQrIfIncomplete(
      principal.accountId,
      restaurantId,
      { qrPayload, qrPng, qrSvg },
    );
    if (!stored || !isMaterializedQr(stored)) {
      throw new RestaurantApplicationError(
        'QR_UNAVAILABLE',
        'Restaurant QR could not be materialized',
      );
    }
    return stored;
  }
}

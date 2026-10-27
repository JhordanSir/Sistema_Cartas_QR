import type { ServerResponse } from 'node:http';

import {
  Controller,
  Get,
  Inject,
  Logger,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';

import { AuthRole } from '../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../auth/domain/auth.types.js';
import { OwnerRestaurantGuard } from '../auth/presentation/owner-restaurant.guard.js';
import { CurrentPrincipal, Roles } from '../auth/presentation/auth.decorators.js';
import type { StreamOwnedProducts } from './application/use-cases/product-stream.use-cases.js';
import { STREAM_OWNED_PRODUCTS } from './menu-management.tokens.js';
import { ProductStreamQueryDto } from './presentation/menu-management.dto.js';
import { throwMenuManagementHttpError } from './presentation/menu-management-http.errors.js';
import { sendNdjson } from './presentation/ndjson-stream.js';

@Controller('owner/restaurants/:restaurantId/menu/products/stream')
@Roles(AuthRole.OWNER)
@UseGuards(OwnerRestaurantGuard)
export class ProductStreamController {
  private readonly logger = new Logger(ProductStreamController.name);

  constructor(
    @Inject(STREAM_OWNED_PRODUCTS) private readonly streamOwnedProducts: StreamOwnedProducts,
  ) {}

  /**
   * Every product of the owner's menu as NDJSON, one object per line, read
   * from PostgreSQL in batches while the client consumes them. The response is
   * written by hand (@Res) because Nest would otherwise wait for a single value.
   */
  @Get()
  async stream(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
    @Query() query: ProductStreamQueryDto,
    @Res() response: ServerResponse,
  ): Promise<void> {
    let products: Awaited<ReturnType<StreamOwnedProducts['execute']>>;
    try {
      products = await this.streamOwnedProducts.execute({ principal, restaurantId });
    } catch (error) {
      throwMenuManagementHttpError(error);
    }

    const startedAt = performance.now();
    try {
      const { cancelled, lines } = await sendNdjson(products, response, query.delayMs);
      const elapsed = Math.round(performance.now() - startedAt);
      const objects = `${lines} ${lines === 1 ? 'object' : 'objects'}`;
      this.logger.log(
        `Product stream for ${restaurantId}: ${objects} ${cancelled ? 'sent before the client disconnected' : 'sent'} in ${elapsed} ms`,
      );
    } catch (error) {
      // Headers are already out, so the only signal left is the cut connection,
      // which pipeline has already made.
      this.logger.error(
        `Product stream for ${restaurantId} failed`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

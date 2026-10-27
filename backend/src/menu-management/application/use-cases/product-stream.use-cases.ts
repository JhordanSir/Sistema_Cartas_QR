import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import { MenuManagementApplicationError } from '../../domain/menu-management.errors.js';
import {
  PRODUCT_STREAM_LIMITS,
  type ProductStreamCategory,
  type ProductStreamCursor,
  type ProductStreamItem,
  type ProductStreamRow,
} from '../../domain/menu-management.types.js';
import { assertOwner } from '../menu-management.validation.js';
import type { ProductStreamRepository } from '../ports/menu-management.repositories.js';

export class StreamOwnedProducts {
  constructor(
    private readonly repository: ProductStreamRepository,
    private readonly batchSize = PRODUCT_STREAM_LIMITS.batchSize,
  ) {}

  /**
   * Checks ownership before anything is sent, so a refusal can still be an
   * ordinary error response. What it returns is lazy: each batch is read only
   * when the consumer asks for more, and a consumer that stops early (a client
   * that disconnects) stops the reading too.
   */
  async execute(input: {
    principal: AuthPrincipal;
    restaurantId: string;
  }): Promise<AsyncGenerator<ProductStreamItem, void, undefined>> {
    assertOwner(input.principal);
    const categories = await this.repository.findStreamCategories(
      input.principal.accountId,
      input.restaurantId,
    );
    if (!categories) {
      throw new MenuManagementApplicationError('RESTAURANT_NOT_FOUND', 'Restaurant not found.');
    }
    return this.read(input.restaurantId, categories);
  }

  private async *read(
    restaurantId: string,
    categories: ProductStreamCategory[],
  ): AsyncGenerator<ProductStreamItem, void, undefined> {
    let position = 0;
    for (const category of categories) {
      let after: ProductStreamCursor | null = null;
      let batch: ProductStreamRow[];
      do {
        batch = await this.repository.findProductBatch(restaurantId, category.id, after, this.batchSize);
        for (const row of batch) {
          position += 1;
          yield toStreamItem(row, category, position);
        }
        const last = batch.at(-1);
        if (last) after = { id: last.id, sortOrder: last.sortOrder };
      } while (batch.length === this.batchSize);
    }
  }
}

/**
 * The wire shape of one product: the row without its internal sort key. Keys
 * follow reading order, since each one becomes a line people read as it is.
 */
function toStreamItem(
  row: ProductStreamRow,
  category: ProductStreamCategory,
  position: number,
): ProductStreamItem {
  return {
    position,
    id: row.id,
    name: row.name,
    category,
    basePrice: row.basePrice,
    description: row.description,
    isAvailable: row.isAvailable,
    hasImage: row.hasImage,
    variants: row.variants,
    extras: row.extras,
    updatedAt: row.updatedAt,
  };
}

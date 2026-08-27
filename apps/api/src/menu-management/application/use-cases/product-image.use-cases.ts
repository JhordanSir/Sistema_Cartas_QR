import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import type { PublishedMenu } from '../../../digitization/domain/menu.types.js';
import { MenuManagementApplicationError } from '../../domain/menu-management.errors.js';
import type {
  ProductImageUpload,
  StoredProductImage,
} from '../../domain/menu-management.types.js';
import { assertOwner, validateProductImage } from '../menu-management.validation.js';
import type {
  ProductImageReadRepository,
  ProductManagementRepository,
} from '../ports/menu-management.repositories.js';
import type { ProductImageStorage } from '../ports/product-image.storage.js';

export class UploadProductImage {
  constructor(
    private readonly repository: ProductManagementRepository,
    private readonly storage: ProductImageStorage,
  ) {}

  async execute(input: {
    image: ProductImageUpload;
    principal: AuthPrincipal;
    productId: string;
    restaurantId: string;
  }): Promise<PublishedMenu> {
    assertOwner(input.principal);
    validateProductImage(input.image);
    const product = await this.repository.findProductForOwner(
      input.principal.accountId,
      input.restaurantId,
      input.productId,
    );
    if (!product) notFound();
    const imagePath = await this.storage.saveImage(
      input.restaurantId,
      input.productId,
      input.image,
    );
    const menu = await this.repository.setProductImagePath(
      input.principal.accountId,
      input.restaurantId,
      input.productId,
      imagePath,
    );
    if (!menu) {
      await this.storage.deleteImage(imagePath);
      notFound();
    }
    return menu;
  }
}

export class DeleteProductImage {
  constructor(
    private readonly repository: ProductManagementRepository,
    private readonly storage: ProductImageStorage,
  ) {}

  async execute(input: {
    principal: AuthPrincipal;
    productId: string;
    restaurantId: string;
  }): Promise<PublishedMenu> {
    assertOwner(input.principal);
    const product = await this.repository.findProductForOwner(
      input.principal.accountId,
      input.restaurantId,
      input.productId,
    );
    if (!product) notFound();
    const menu = await this.repository.setProductImagePath(
      input.principal.accountId,
      input.restaurantId,
      input.productId,
      null,
    );
    if (!menu) notFound();
    if (product.imagePath) await this.storage.deleteImage(product.imagePath);
    return menu;
  }
}

export class GetOwnedProductImage {
  constructor(
    private readonly repository: ProductImageReadRepository,
    private readonly storage: ProductImageStorage,
  ) {}

  async execute(input: {
    principal: AuthPrincipal;
    productId: string;
    restaurantId: string;
  }): Promise<StoredProductImage | null> {
    assertOwner(input.principal);
    const product = await this.repository.findProductForOwner(
      input.principal.accountId,
      input.restaurantId,
      input.productId,
    );
    if (!product) notFound();
    return product.imagePath ? this.storage.readImage(product.imagePath) : null;
  }
}

export class GetPublicProductImage {
  constructor(
    private readonly repository: ProductImageReadRepository,
    private readonly storage: ProductImageStorage,
  ) {}

  async execute(input: { productId: string; slug: string }): Promise<StoredProductImage | null> {
    const imagePath = await this.repository.findPublicProductImage(input.slug, input.productId);
    return imagePath ? this.storage.readImage(imagePath) : null;
  }
}

function notFound(): never {
  throw new MenuManagementApplicationError('PRODUCT_NOT_FOUND', 'Product not found.');
}

import type {
  ProductImageUpload,
  StoredProductImage,
} from '../../domain/menu-management.types.js';

export interface ProductImageStorage {
  deleteImage(relativePath: string): Promise<void>;
  readImage(relativePath: string): Promise<StoredProductImage | null>;
  saveImage(
    restaurantId: string,
    productId: string,
    image: ProductImageUpload,
  ): Promise<string>;
}

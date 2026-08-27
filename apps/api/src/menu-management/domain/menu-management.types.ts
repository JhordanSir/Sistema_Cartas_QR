export const PRODUCT_IMAGE_LIMITS = {
  acceptedContentTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  maximumBytes: 4 * 1024 * 1024,
};

export interface ProductImageUpload {
  bytes: Uint8Array;
  contentType: string;
}

export interface StoredProductImage {
  bytes: Uint8Array;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface ProductOptionInput {
  name: string;
  price: string;
}

export interface ProductValues {
  basePrice: string;
  categoryId: string;
  description: string | null;
  extras: ProductOptionInput[];
  name: string;
  variants: ProductOptionInput[];
}

export interface ProductPatch {
  basePrice?: string;
  categoryId?: string;
  description?: string | null;
  extras?: ProductOptionInput[];
  isAvailable?: boolean;
  name?: string;
  variants?: ProductOptionInput[];
}

export interface ProductAssetRecord {
  imagePath: string | null;
  productId: string;
  restaurantId: string;
}

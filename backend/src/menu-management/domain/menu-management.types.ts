import { ACCEPTED_IMAGE_TYPES, UPLOAD_LIMITS } from '@sirio/shared';

export const PRODUCT_IMAGE_LIMITS = {
  acceptedContentTypes: ACCEPTED_IMAGE_TYPES,
  maximumBytes: UPLOAD_LIMITS.productImage.maximumBytes,
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

export const PRODUCT_STREAM_LIMITS = {
  /** Rows read per query: the stream never holds more than one batch. */
  batchSize: 20,
  /** Longest pause the client may ask for between two objects. */
  maximumDelayMs: 1000,
};

export interface ProductStreamCategory {
  id: string;
  name: string;
}

/** Keyset position inside a category: the last product read. */
export interface ProductStreamCursor {
  id: string;
  sortOrder: number;
}

/** A product row as the stream reads it, before it gets its position. */
export interface ProductStreamRow extends ProductStreamCursor {
  basePrice: string;
  description: string | null;
  extras: ProductOptionInput[];
  hasImage: boolean;
  isAvailable: boolean;
  name: string;
  updatedAt: string;
  variants: ProductOptionInput[];
}

/** One object of the owner's product stream, sent as one line of NDJSON. */
export interface ProductStreamItem extends Omit<ProductStreamRow, 'sortOrder'> {
  category: ProductStreamCategory;
  /** 1-based order of arrival, so the client can tell what it received. */
  position: number;
}

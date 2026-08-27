import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

import { detectProductImageContentType } from '../application/menu-management.validation.js';
import type { ProductImageStorage } from '../application/ports/product-image.storage.js';
import type {
  ProductImageUpload,
  StoredProductImage,
} from '../domain/menu-management.types.js';

const PRODUCT_IMAGE_PATH = /^restaurants\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/products\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/image$/;

export class LocalProductImageStorage implements ProductImageStorage {
  private readonly root: string;

  constructor(storagePath: string) {
    this.root = resolve(storagePath);
  }

  async saveImage(
    restaurantId: string,
    productId: string,
    image: ProductImageUpload,
  ): Promise<string> {
    const relativePath = `restaurants/${restaurantId}/products/${productId}/image`;
    const target = this.resolveImagePath(relativePath);
    const temporary = `${target}.${randomUUID()}.tmp`;
    await mkdir(dirname(target), { recursive: true });
    try {
      await writeFile(temporary, image.bytes, { flag: 'wx' });
      await rm(target, { force: true });
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
    return relativePath;
  }

  async readImage(relativePath: string): Promise<StoredProductImage | null> {
    const target = this.resolveImagePath(relativePath);
    try {
      const bytes = await readFile(target);
      const contentType = detectProductImageContentType(bytes);
      return contentType ? { bytes, contentType } : null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async deleteImage(relativePath: string): Promise<void> {
    const target = this.resolveImagePath(relativePath);
    await rm(dirname(target), { force: true, recursive: true });
  }

  private resolveImagePath(relativePath: string): string {
    const normalizedPath = relativePath.replaceAll('\\', '/');
    if (!PRODUCT_IMAGE_PATH.test(normalizedPath)) {
      throw new Error('Invalid product image path');
    }
    const target = resolve(this.root, normalizedPath);
    const pathFromRoot = relative(this.root, target);
    if (
      pathFromRoot === '' ||
      pathFromRoot === '..' ||
      pathFromRoot.startsWith(`..${sep}`)
    ) {
      throw new Error('Product image path escapes the storage root');
    }
    return target;
  }
}

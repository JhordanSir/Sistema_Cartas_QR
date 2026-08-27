import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

import type {
  RestaurantAssetStorage,
  RestaurantLogoStorage,
  RestaurantLogoUpload,
  RestaurantStoredLogo,
} from '../application/ports/restaurant-services.js';
import { detectLogoContentType } from '../application/restaurant-profile.validation.js';

const RESTAURANT_ASSET_PATH = /^restaurants\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const RESTAURANT_LOGO_PATH = /^restaurants\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/profile\/logo$/;

export class LocalRestaurantAssetStorage
  implements RestaurantAssetStorage, RestaurantLogoStorage
{
  private readonly root: string;

  constructor(storagePath: string) {
    this.root = resolve(storagePath);
  }

  async deleteDirectory(relativePath: string): Promise<void> {
    const normalizedPath = relativePath.replaceAll('\\', '/');
    if (!RESTAURANT_ASSET_PATH.test(normalizedPath)) {
      throw new Error('Invalid restaurant asset path');
    }

    const target = resolve(this.root, normalizedPath);
    const pathFromRoot = relative(this.root, target);
    if (
      pathFromRoot === '' ||
      pathFromRoot === '..' ||
      pathFromRoot.startsWith(`..${sep}`)
    ) {
      throw new Error('Restaurant asset path escapes the storage root');
    }

    await rm(target, { force: true, recursive: true });
  }

  async saveLogo(
    restaurantId: string,
    logo: RestaurantLogoUpload,
  ): Promise<string> {
    const relativePath = `restaurants/${restaurantId}/profile/logo`;
    const target = this.resolveLogoPath(relativePath);
    const temporary = `${target}.${randomUUID()}.tmp`;
    await mkdir(dirname(target), { recursive: true });
    try {
      await writeFile(temporary, logo.bytes, { flag: 'wx' });
      await rm(target, { force: true });
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
    return relativePath;
  }

  async readLogo(relativePath: string): Promise<RestaurantStoredLogo | null> {
    const target = this.resolveLogoPath(relativePath);
    try {
      const bytes = await readFile(target);
      const contentType = detectLogoContentType(bytes);
      return contentType ? { bytes, contentType } : null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  private resolveLogoPath(relativePath: string): string {
    const normalizedPath = relativePath.replaceAll('\\', '/');
    if (!RESTAURANT_LOGO_PATH.test(normalizedPath)) {
      throw new Error('Invalid restaurant logo path');
    }
    const target = resolve(this.root, normalizedPath);
    const pathFromRoot = relative(this.root, target);
    if (
      pathFromRoot === '' ||
      pathFromRoot === '..' ||
      pathFromRoot.startsWith(`..${sep}`)
    ) {
      throw new Error('Restaurant logo path escapes the storage root');
    }
    return target;
  }
}

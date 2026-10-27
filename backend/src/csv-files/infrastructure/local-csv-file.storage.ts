import { randomUUID } from 'node:crypto';
import { mkdir, open, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

import type { CsvFileStorage } from '../application/ports/csv-file.ports.js';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const CSV_FILE_PATH = new RegExp(`^restaurants/${UUID}/csv/${UUID}\\.csv$`);

/**
 * The saved CSV lives inside the restaurant's folder, so deleting the restaurant
 * removes it too. Every save gets a fresh name: the database switches to it only
 * once it is fully written, and the old file is removed afterwards.
 */
export class LocalCsvFileStorage implements CsvFileStorage {
  private readonly root: string;

  constructor(storagePath: string) {
    this.root = resolve(storagePath);
  }

  async saveFile(restaurantId: string, bytes: Uint8Array): Promise<string> {
    const relativePath = `restaurants/${restaurantId}/csv/${randomUUID()}.csv`;
    const target = this.resolvePath(relativePath);
    const temporary = `${target}.${randomUUID()}.tmp`;
    await mkdir(dirname(target), { recursive: true });
    try {
      await writeFile(temporary, bytes, { flag: 'wx' });
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
    return relativePath;
  }

  async openFile(relativePath: string): Promise<AsyncIterable<Uint8Array> | null> {
    try {
      // Opening first turns a missing file into null instead of a stream error later.
      const handle = await open(this.resolvePath(relativePath), 'r');
      return handle.createReadStream();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async deleteFile(relativePath: string): Promise<void> {
    await rm(this.resolvePath(relativePath), { force: true });
  }

  private resolvePath(relativePath: string): string {
    const normalizedPath = relativePath.replaceAll('\\', '/');
    if (!CSV_FILE_PATH.test(normalizedPath)) {
      throw new Error('Invalid CSV file path');
    }
    const target = resolve(this.root, normalizedPath);
    const pathFromRoot = relative(this.root, target);
    if (pathFromRoot === '' || pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`)) {
      throw new Error('CSV file path escapes the storage root');
    }
    return target;
  }
}

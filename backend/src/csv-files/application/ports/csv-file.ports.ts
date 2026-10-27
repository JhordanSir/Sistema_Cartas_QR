import type { CsvFileRecord } from '../../domain/csv-file.types.js';

export interface CsvFileRepository {
  /** The saved CSV of an owned restaurant, or null when there is none. */
  findCsvFile(ownerId: string, restaurantId: string): Promise<CsvFileRecord | null>;
  isOwnedRestaurant(ownerId: string, restaurantId: string): Promise<boolean>;
  /**
   * Points the restaurant at a new file and hands back the one it replaced, so its
   * bytes can be removed. Null when the restaurant is not the owner's.
   */
  replaceCsvFile(
    ownerId: string,
    restaurantId: string,
    file: Omit<CsvFileRecord, 'uploadedAt'>,
  ): Promise<{ current: CsvFileRecord; previous: CsvFileRecord | null } | null>;
}

export interface CsvFileStorage {
  deleteFile(relativePath: string): Promise<void>;
  /** Null when the bytes are gone from the volume. */
  openFile(relativePath: string): Promise<AsyncIterable<Uint8Array> | null>;
  /** Writes the bytes under a fresh name and returns its path. */
  saveFile(restaurantId: string, bytes: Uint8Array): Promise<string>;
}

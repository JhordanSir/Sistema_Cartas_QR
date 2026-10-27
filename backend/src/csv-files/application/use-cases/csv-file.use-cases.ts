import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import { CsvFileApplicationError } from '../../domain/csv-file.errors.js';
import type { CsvFileContent, CsvFileInfo, CsvFileRecord } from '../../domain/csv-file.types.js';
import { assertOwner, normalizeCsvUpload } from '../csv-file.validation.js';
import type { CsvFileRepository, CsvFileStorage } from '../ports/csv-file.ports.js';

/** Saves the owner's CSV as the restaurant's only one, replacing the previous file. */
export class SaveRestaurantCsv {
  constructor(
    private readonly repository: CsvFileRepository,
    private readonly storage: CsvFileStorage,
  ) {}

  async execute(input: {
    bytes: Uint8Array | undefined;
    originalName: unknown;
    principal: AuthPrincipal;
    restaurantId: string;
  }): Promise<CsvFileInfo> {
    assertOwner(input.principal);
    const upload = normalizeCsvUpload(input);
    const ownerId = input.principal.accountId;
    if (!(await this.repository.isOwnedRestaurant(ownerId, input.restaurantId))) {
      restaurantNotFound();
    }
    const relativePath = await this.storage.saveFile(input.restaurantId, upload.bytes);
    const replaced = await this.repository.replaceCsvFile(ownerId, input.restaurantId, {
      originalName: upload.originalName,
      relativePath,
      sizeBytes: upload.bytes.length,
    });
    if (!replaced) {
      await this.storage.deleteFile(relativePath);
      restaurantNotFound();
    }
    if (replaced.previous) {
      // The new file is already the saved one. A copy that cannot be removed now
      // goes away with the restaurant's folder, so it never fails the save.
      await this.storage.deleteFile(replaced.previous.relativePath).catch(() => undefined);
    }
    return toInfo(replaced.current);
  }
}

export class GetRestaurantCsv {
  constructor(private readonly repository: CsvFileRepository) {}

  async execute(input: { principal: AuthPrincipal; restaurantId: string }): Promise<CsvFileInfo> {
    assertOwner(input.principal);
    const file = await this.repository.findCsvFile(input.principal.accountId, input.restaurantId);
    if (!file) csvNotFound();
    return toInfo(file);
  }
}

/** The saved CSV for the page's worker, read from disk as it is sent. */
export class OpenRestaurantCsv {
  constructor(
    private readonly repository: CsvFileRepository,
    private readonly storage: CsvFileStorage,
  ) {}

  async execute(input: { principal: AuthPrincipal; restaurantId: string }): Promise<CsvFileContent> {
    assertOwner(input.principal);
    const file = await this.repository.findCsvFile(input.principal.accountId, input.restaurantId);
    if (!file) csvNotFound();
    const content = await this.storage.openFile(file.relativePath);
    if (!content) csvNotFound();
    return { content, info: toInfo(file) };
  }
}

function toInfo(file: CsvFileRecord): CsvFileInfo {
  return {
    originalName: file.originalName,
    sizeBytes: file.sizeBytes,
    uploadedAt: file.uploadedAt.toISOString(),
  };
}

function csvNotFound(): never {
  throw new CsvFileApplicationError('CSV_FILE_NOT_FOUND', 'The restaurant has no saved CSV.');
}

function restaurantNotFound(): never {
  throw new CsvFileApplicationError('RESTAURANT_NOT_FOUND', 'Restaurant not found.');
}

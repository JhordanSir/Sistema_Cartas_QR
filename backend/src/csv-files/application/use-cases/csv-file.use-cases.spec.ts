import { AuthRole } from '../../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import type { CsvFileRecord } from '../../domain/csv-file.types.js';
import type { CsvFileRepository, CsvFileStorage } from '../ports/csv-file.ports.js';
import { GetRestaurantCsv, OpenRestaurantCsv, SaveRestaurantCsv } from './csv-file.use-cases.js';

const RESTAURANT_ID = '33333333-3333-4333-8333-333333333333';
const principal: AuthPrincipal = {
  accountId: '44444444-4444-4444-8444-444444444444',
  email: 'owner@example.com',
  role: AuthRole.OWNER,
  sessionId: '55555555-5555-4555-8555-555555555555',
};
const UPLOADED_AT = new Date('2026-10-27T15:00:00.000Z');
const bytes = new TextEncoder().encode('nombre;precio\nCeviche;35\n');

function record(relativePath: string, originalName = 'carta.csv'): CsvFileRecord {
  return { originalName, relativePath, sizeBytes: bytes.length, uploadedAt: UPLOADED_AT };
}

function fakes(): { repository: jest.Mocked<CsvFileRepository>; storage: jest.Mocked<CsvFileStorage> } {
  return {
    repository: {
      findCsvFile: jest.fn().mockResolvedValue(null),
      isOwnedRestaurant: jest.fn().mockResolvedValue(true),
      replaceCsvFile: jest.fn(),
    },
    storage: {
      deleteFile: jest.fn().mockResolvedValue(undefined),
      openFile: jest.fn(),
      saveFile: jest.fn().mockResolvedValue('restaurants/r/csv/new.csv'),
    },
  };
}

describe('SaveRestaurantCsv', () => {
  it('writes the file, points the restaurant at it and removes the replaced one', async () => {
    const { repository, storage } = fakes();
    repository.replaceCsvFile.mockResolvedValue({
      current: record('restaurants/r/csv/new.csv', 'nueva.csv'),
      previous: record('restaurants/r/csv/old.csv'),
    });

    const info = await new SaveRestaurantCsv(repository, storage).execute({
      bytes,
      originalName: 'nueva.csv',
      principal,
      restaurantId: RESTAURANT_ID,
    });

    expect(info).toEqual({ originalName: 'nueva.csv', sizeBytes: bytes.length, uploadedAt: UPLOADED_AT.toISOString() });
    expect(storage.saveFile).toHaveBeenCalledWith(RESTAURANT_ID, bytes);
    expect(repository.replaceCsvFile).toHaveBeenCalledWith(principal.accountId, RESTAURANT_ID, {
      originalName: 'nueva.csv',
      relativePath: 'restaurants/r/csv/new.csv',
      sizeBytes: bytes.length,
    });
    expect(storage.deleteFile).toHaveBeenCalledWith('restaurants/r/csv/old.csv');
  });

  it('still reports the save when the old copy cannot be removed', async () => {
    const { repository, storage } = fakes();
    repository.replaceCsvFile.mockResolvedValue({
      current: record('restaurants/r/csv/new.csv'),
      previous: record('restaurants/r/csv/old.csv'),
    });
    storage.deleteFile.mockRejectedValue(new Error('EPERM'));

    await expect(
      new SaveRestaurantCsv(repository, storage).execute({ bytes, originalName: 'carta.csv', principal, restaurantId: RESTAURANT_ID }),
    ).resolves.toMatchObject({ originalName: 'carta.csv' });
  });

  it('writes nothing for a restaurant that is not the owner’s', async () => {
    const { repository, storage } = fakes();
    repository.isOwnedRestaurant.mockResolvedValue(false);

    await expect(
      new SaveRestaurantCsv(repository, storage).execute({ bytes, originalName: 'carta.csv', principal, restaurantId: RESTAURANT_ID }),
    ).rejects.toMatchObject({ code: 'RESTAURANT_NOT_FOUND' });
    expect(storage.saveFile).not.toHaveBeenCalled();
  });

  it('removes the new file when the restaurant disappears before the switch', async () => {
    const { repository, storage } = fakes();
    repository.replaceCsvFile.mockResolvedValue(null);

    await expect(
      new SaveRestaurantCsv(repository, storage).execute({ bytes, originalName: 'carta.csv', principal, restaurantId: RESTAURANT_ID }),
    ).rejects.toMatchObject({ code: 'RESTAURANT_NOT_FOUND' });
    expect(storage.deleteFile).toHaveBeenCalledWith('restaurants/r/csv/new.csv');
  });

  it('validates before touching the disk', async () => {
    const { repository, storage } = fakes();

    await expect(
      new SaveRestaurantCsv(repository, storage).execute({ bytes, originalName: 'carta.xlsx', principal, restaurantId: RESTAURANT_ID }),
    ).rejects.toMatchObject({ code: 'CSV_FILE_INVALID' });
    expect(storage.saveFile).not.toHaveBeenCalled();
  });
});

describe('GetRestaurantCsv', () => {
  it('describes the saved file, or says there is none', async () => {
    const { repository } = fakes();
    const useCase = new GetRestaurantCsv(repository);

    await expect(useCase.execute({ principal, restaurantId: RESTAURANT_ID })).rejects.toMatchObject({
      code: 'CSV_FILE_NOT_FOUND',
    });
    repository.findCsvFile.mockResolvedValue(record('restaurants/r/csv/a.csv'));
    await expect(useCase.execute({ principal, restaurantId: RESTAURANT_ID })).resolves.toEqual({
      originalName: 'carta.csv',
      sizeBytes: bytes.length,
      uploadedAt: UPLOADED_AT.toISOString(),
    });
  });
});

describe('OpenRestaurantCsv', () => {
  it('hands back the stored bytes as a stream', async () => {
    const { repository, storage } = fakes();
    const content = (async function* (): AsyncGenerator<Uint8Array> {
      yield await Promise.resolve(bytes);
    })();
    repository.findCsvFile.mockResolvedValue(record('restaurants/r/csv/a.csv'));
    storage.openFile.mockResolvedValue(content);

    const opened = await new OpenRestaurantCsv(repository, storage).execute({ principal, restaurantId: RESTAURANT_ID });

    expect(opened.content).toBe(content);
    expect(storage.openFile).toHaveBeenCalledWith('restaurants/r/csv/a.csv');
  });

  it('treats bytes missing from the volume as no saved file', async () => {
    const { repository, storage } = fakes();
    repository.findCsvFile.mockResolvedValue(record('restaurants/r/csv/a.csv'));
    storage.openFile.mockResolvedValue(null);

    await expect(
      new OpenRestaurantCsv(repository, storage).execute({ principal, restaurantId: RESTAURANT_ID }),
    ).rejects.toMatchObject({ code: 'CSV_FILE_NOT_FOUND' });
  });
});

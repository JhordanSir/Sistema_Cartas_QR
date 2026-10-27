import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LocalCsvFileStorage } from './local-csv-file.storage.js';

const RESTAURANT_ID = '33333333-3333-4333-8333-333333333333';

async function readAll(stream: AsyncIterable<Uint8Array>): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

describe('LocalCsvFileStorage', () => {
  let storageRoot: string;

  beforeEach(async () => {
    storageRoot = await mkdtemp(join(tmpdir(), 'sirio-csv-storage-'));
  });

  afterEach(async () => {
    await rm(storageRoot, { force: true, recursive: true });
  });

  it('keeps each save under a fresh name inside the restaurant folder', async () => {
    const storage = new LocalCsvFileStorage(storageRoot);

    const first = await storage.saveFile(RESTAURANT_ID, new TextEncoder().encode('a;b\n1;2\n'));
    const second = await storage.saveFile(RESTAURANT_ID, new TextEncoder().encode('c;d\n'));

    expect(first).toMatch(new RegExp(`^restaurants/${RESTAURANT_ID}/csv/[0-9a-f-]{36}\\.csv$`));
    expect(second).not.toBe(first);
    const opened = await storage.openFile(first);
    expect(opened).not.toBeNull();
    await expect(readAll(opened!)).resolves.toBe('a;b\n1;2\n');
  });

  it('opens a missing file as null and deletes without complaint', async () => {
    const storage = new LocalCsvFileStorage(storageRoot);
    const relativePath = await storage.saveFile(RESTAURANT_ID, new TextEncoder().encode('x'));

    await storage.deleteFile(relativePath);

    await expect(access(join(storageRoot, relativePath))).rejects.toThrow();
    await expect(storage.openFile(relativePath)).resolves.toBeNull();
    await expect(storage.deleteFile(relativePath)).resolves.toBeUndefined();
  });

  it('refuses paths outside the restaurant CSV folder', async () => {
    const storage = new LocalCsvFileStorage(storageRoot);

    await expect(storage.openFile('../../etc/passwd')).rejects.toThrow('Invalid CSV file path');
    await expect(
      storage.deleteFile(`restaurants/${RESTAURANT_ID}/products/x/image`),
    ).rejects.toThrow('Invalid CSV file path');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const jobs = vi.hoisted(() => ({
  claimJob: vi.fn<(restaurantId: string, jobId: string) => Promise<string[] | null>>(),
  completeJob: vi.fn<(restaurantId: string, jobId: string, menu: unknown) => Promise<string[] | null>>(),
  failJob: vi.fn<(jobId: string, code: string) => Promise<void>>(),
  readPhotos: vi.fn<(keys: readonly string[]) => Promise<{ data: Uint8Array; mimeType: 'image/png' }[]>>(),
}));
const blobs = vi.hoisted(() => ({ deleteBlobQuietly: vi.fn<(key: string) => Promise<void>>() }));

vi.mock('./jobs', () => jobs);
vi.mock('../blobs', () => blobs);

import { ExtractionError, type MenuExtractor } from './extractor';
import { SAMPLE_EXTRACTED_MENU } from './fake-extractor';
import { failureCode, runDigitizationJob } from './run';

const photoKeys = ['digitization/job/1', 'digitization/job/2'];

function extractor(result: () => Promise<unknown>): MenuExtractor {
  return { extractMenu: vi.fn(result) };
}

describe('runDigitizationJob', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    jobs.claimJob.mockResolvedValue(photoKeys);
    jobs.readPhotos.mockResolvedValue([{ data: new Uint8Array([1]), mimeType: 'image/png' }]);
    jobs.completeJob.mockResolvedValue(['restaurants/r/products/p/vieja']);
    jobs.failJob.mockResolvedValue(undefined);
    blobs.deleteBlobQuietly.mockResolvedValue(undefined);
  });

  it('sin reclamar el trabajo no hace nada', async () => {
    jobs.claimJob.mockResolvedValue(null);
    const fake = extractor(async () => SAMPLE_EXTRACTED_MENU);

    await runDigitizationJob({ extractor: fake, jobId: 'job', restaurantId: 'r' });

    expect(fake.extractMenu).not.toHaveBeenCalled();
    expect(blobs.deleteBlobQuietly).not.toHaveBeenCalled();
  });

  it('reemplaza el borrador y borra las imágenes viejas y las fotos', async () => {
    await runDigitizationJob({ extractor: extractor(async () => SAMPLE_EXTRACTED_MENU), jobId: 'job', restaurantId: 'r' });

    expect(jobs.completeJob).toHaveBeenCalledWith('r', 'job', expect.objectContaining({ categories: expect.any(Array) }));
    expect(jobs.failJob).not.toHaveBeenCalled();
    expect(blobs.deleteBlobQuietly.mock.calls.map(([key]) => key)).toEqual([
      'restaurants/r/products/p/vieja',
      ...photoKeys,
    ]);
  });

  it('marca FAILED con el código del extractor y aun así borra las fotos', async () => {
    const failing = extractor(async () => {
      throw new ExtractionError('MODEL_TIMEOUT');
    });

    await runDigitizationJob({ extractor: failing, jobId: 'job', restaurantId: 'r' });

    expect(jobs.failJob).toHaveBeenCalledWith('job', 'MODEL_TIMEOUT');
    expect(jobs.completeJob).not.toHaveBeenCalled();
    expect(blobs.deleteBlobQuietly.mock.calls.map(([key]) => key)).toEqual(photoKeys);
  });

  it('una carta inválida termina en INVALID_MODEL_RESPONSE', async () => {
    await runDigitizationJob({ extractor: extractor(async () => ({ categories: [] })), jobId: 'job', restaurantId: 'r' });

    expect(jobs.failJob).toHaveBeenCalledWith('job', 'INVALID_MODEL_RESPONSE');
  });

  it('nunca lanza, aunque falle hasta marcar el error', async () => {
    jobs.readPhotos.mockRejectedValue(new Error('blob missing'));
    jobs.failJob.mockRejectedValue(new Error('database down'));

    await expect(
      runDigitizationJob({ extractor: extractor(async () => SAMPLE_EXTRACTED_MENU), jobId: 'job', restaurantId: 'r' }),
    ).resolves.toBeUndefined();
    expect(blobs.deleteBlobQuietly).toHaveBeenCalledTimes(photoKeys.length);
  });
});

describe('failureCode', () => {
  it('distingue los errores del extractor, de la carta y los demás', () => {
    expect(failureCode(new ExtractionError('MODEL_UNAVAILABLE'))).toBe('MODEL_UNAVAILABLE');
    expect(failureCode(new Error('x'))).toBe('INTERNAL_ERROR');
  });
});

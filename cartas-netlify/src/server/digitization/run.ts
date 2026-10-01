import { InvalidExtractedMenuError, parseExtractedMenu } from '../../shared/parse-extracted-menu';
import { deleteBlobQuietly } from '../blobs';
import { describeErrorForLog } from '../db-errors';
import { ExtractionError, type MenuExtractor } from './extractor';
import { claimJob, completeJob, failJob, readPhotos } from './jobs';

/** The error code a failed job keeps (§E10). */
export function failureCode(error: unknown): string {
  if (error instanceof ExtractionError) return error.code;
  if (error instanceof InvalidExtractedMenuError) return 'INVALID_MODEL_RESPONSE';
  return 'INTERNAL_ERROR';
}

/**
 * The work of the Background Function (§E10). It never throws: Netlify retries
 * a background function that fails, and a retry must not run the job twice.
 * The atomic claim already guarantees that only one invocation does the work.
 */
export async function runDigitizationJob({
  extractor,
  jobId,
  restaurantId,
}: {
  extractor: MenuExtractor;
  jobId: string;
  restaurantId: string;
}): Promise<void> {
  let photoKeys: string[] | null = null;
  try {
    photoKeys = await claimJob(restaurantId, jobId);
    if (!photoKeys) return;

    const photos = await readPhotos(photoKeys);
    const menu = parseExtractedMenu(await extractor.extractMenu(photos));
    const replacedImages = await completeJob(restaurantId, jobId, menu);
    if (replacedImages) await Promise.all(replacedImages.map(deleteBlobQuietly));
  } catch (error) {
    console.error('Digitization job failed', jobId, describeErrorForLog(error));
    try {
      await failJob(jobId, failureCode(error));
    } catch (markError) {
      console.error('Could not mark the digitization job as failed', jobId, describeErrorForLog(markError));
    }
  } finally {
    // The photos are only needed during the job; they are never kept (§E10).
    if (photoKeys) await Promise.all(photoKeys.map(deleteBlobQuietly));
  }
}

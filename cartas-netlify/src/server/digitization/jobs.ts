import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';

import { getDb, type Executor } from '../../../db/index';
import { categories, digitizationJobs, productExtras, products, productVariants, restaurants } from '../../../db/schema';
import { DIGITIZATION_LIMITS, type DigitizationJobView } from '../../shared/digitization';
import type { ImageMimeType } from '../../shared/images';
import type { ExtractedMenu } from '../../shared/parse-extracted-menu';
import {
  deleteBlobQuietly,
  digitizationPhotoKey,
  photoNumberOf,
  putPhoto,
  readImage,
  storedSize,
} from '../blobs';
import { isUniqueViolation } from '../db-errors';
import { ApiError } from '../http';
import { DIGITIZATION_IN_PROGRESS_MESSAGE, hasActiveDigitization } from '../menu-lock';
import { freshActiveJob, staleActiveJob } from './active';

// Digitization jobs (§E10). Every query filters by the restaurant of the
// session: a job of another restaurant is a 404, like one that does not exist.

const JOB_NOT_FOUND = 'No encontramos esa digitalización.';

type JobRow = { id: string; status: DigitizationJobView['status']; photoKeys: string[]; errorCode: string | null };

const jobColumns = {
  errorCode: digitizationJobs.errorCode,
  id: digitizationJobs.id,
  photoKeys: digitizationJobs.photoKeys,
  status: digitizationJobs.status,
};

export function toJobView(row: JobRow): DigitizationJobView {
  return { errorCode: row.errorCode, id: row.id, photoCount: row.photoKeys.length, status: row.status };
}

/**
 * Marks stale active jobs FAILED and deletes their photos: a crashed function
 * or an abandoned upload must not lock the menu. `restaurantId` null means
 * every restaurant (maintenance), `limit` caps one batch.
 */
export async function expireStaleJobs(
  { limit = 100, restaurantId = null }: { limit?: number; restaurantId?: string | null } = {},
  now = new Date(),
): Promise<number> {
  const db = getDb();
  const candidates = db
    .select({ id: digitizationJobs.id })
    .from(digitizationJobs)
    .where(
      restaurantId
        ? and(eq(digitizationJobs.restaurantId, restaurantId), staleActiveJob(now))
        : staleActiveJob(now),
    )
    .limit(limit);
  const expired = await db
    .update(digitizationJobs)
    .set({
      errorCode: sql`case when ${digitizationJobs.status} = 'PROCESSING' then 'MODEL_TIMEOUT' else 'UPLOAD_ABANDONED' end`,
      finishedAt: now,
      status: 'FAILED',
    })
    .where(and(inArray(digitizationJobs.id, candidates), staleActiveJob(now)))
    .returning({ photoKeys: digitizationJobs.photoKeys });
  await Promise.all(expired.flatMap(({ photoKeys }) => photoKeys.map(deleteBlobQuietly)));
  return expired.length;
}

/** POST /api/digitalizacion: a new job in UPLOADING, or 409 if one is already running. */
export async function createJob(restaurantId: string): Promise<DigitizationJobView> {
  await expireStaleJobs({ restaurantId });
  try {
    return await getDb().transaction(async (tx) => {
      // Same row lock as every menu edit: a job never starts halfway through one.
      await tx.select({ id: restaurants.id }).from(restaurants).where(eq(restaurants.id, restaurantId)).for('update');
      if (await hasActiveDigitization(restaurantId, tx)) {
        throw new ApiError(409, 'DIGITIZATION_IN_PROGRESS', DIGITIZATION_IN_PROGRESS_MESSAGE);
      }
      const [job] = await tx
        .insert(digitizationJobs)
        .values({ restaurantId, status: 'UPLOADING' })
        .returning(jobColumns);
      if (!job) throw new Error('The job insert returned no row.');
      return toJobView(job);
    });
  } catch (error) {
    if (isUniqueViolation(error, 'digitization_jobs_one_active_per_restaurant')) {
      throw new ApiError(409, 'DIGITIZATION_IN_PROGRESS', DIGITIZATION_IN_PROGRESS_MESSAGE);
    }
    throw error;
  }
}

async function findJob(executor: Executor, restaurantId: string, jobId: string): Promise<JobRow | null> {
  const [job] = await executor
    .select(jobColumns)
    .from(digitizationJobs)
    .where(and(eq(digitizationJobs.id, jobId), eq(digitizationJobs.restaurantId, restaurantId)))
    .limit(1);
  return job ?? null;
}

export async function getJob(restaurantId: string, jobId: string): Promise<DigitizationJobView> {
  await expireStaleJobs({ restaurantId });
  const job = await findJob(getDb(), restaurantId, jobId);
  if (!job) throw new ApiError(404, 'NOT_FOUND', JOB_NOT_FOUND);
  return toJobView(job);
}

/** GET /api/digitalizacion/activa: the running job, so the editor can resume following it. */
export async function getActiveJob(restaurantId: string): Promise<DigitizationJobView | null> {
  await expireStaleJobs({ restaurantId });
  const [job] = await getDb()
    .select(jobColumns)
    .from(digitizationJobs)
    .where(and(eq(digitizationJobs.restaurantId, restaurantId), freshActiveJob(new Date())))
    .orderBy(asc(digitizationJobs.createdAt))
    .limit(1);
  return job ? toJobView(job) : null;
}

const PHOTOS_TOO_LARGE = 'Las fotos superan el límite total de 12 MB.';
const NOT_UPLOADING = 'Esta digitalización ya no acepta fotos. Empieza otra.';

/**
 * PUT /api/digitalizacion/{id}/fotos/{n}: stores photo n in Blobs and adds its
 * key to the job. The bytes were already checked by size and signature.
 */
export async function addPhoto(
  restaurantId: string,
  jobId: string,
  photoNumber: number,
  photo: { bytes: Uint8Array; type: ImageMimeType },
): Promise<DigitizationJobView> {
  const job = await findJob(getDb(), restaurantId, jobId);
  if (!job) throw new ApiError(404, 'NOT_FOUND', JOB_NOT_FOUND);
  if (job.status !== 'UPLOADING') throw new ApiError(409, 'JOB_NOT_UPLOADING', NOT_UPLOADING);

  const key = digitizationPhotoKey(jobId, photoNumber);
  const others = job.photoKeys.filter((existing) => existing !== key);
  const othersSize = (await Promise.all(others.map(storedSize))).reduce((total, size) => total + size, 0);
  if (othersSize + photo.bytes.byteLength > DIGITIZATION_LIMITS.maxTotalBytes) {
    throw new ApiError(400, 'PHOTOS_TOO_LARGE', PHOTOS_TOO_LARGE, { photo: PHOTOS_TOO_LARGE });
  }

  await putPhoto(key, photo.bytes, photo.type);
  // Appends in SQL, so two uploads at the same time cannot lose a key.
  const [updated] = await getDb()
    .update(digitizationJobs)
    .set({
      photoKeys: sql`case when ${digitizationJobs.photoKeys} ? ${key} then ${digitizationJobs.photoKeys} else ${digitizationJobs.photoKeys} || to_jsonb(${key}::text) end`,
    })
    .where(
      and(
        eq(digitizationJobs.id, jobId),
        eq(digitizationJobs.restaurantId, restaurantId),
        eq(digitizationJobs.status, 'UPLOADING'),
      ),
    )
    .returning(jobColumns);
  if (!updated) {
    await deleteBlobQuietly(key);
    throw new ApiError(409, 'JOB_NOT_UPLOADING', NOT_UPLOADING);
  }
  return toJobView(updated);
}

/**
 * DELETE /api/digitalizacion/{id}: gives up an upload that was interrupted
 * (the page was closed halfway). Only UPLOADING jobs; a PROCESSING one is
 * already in the hands of the background function.
 */
export async function discardJob(restaurantId: string, jobId: string): Promise<DigitizationJobView> {
  const [discarded] = await getDb()
    .update(digitizationJobs)
    .set({ errorCode: 'UPLOAD_ABANDONED', finishedAt: new Date(), status: 'FAILED' })
    .where(
      and(
        eq(digitizationJobs.id, jobId),
        eq(digitizationJobs.restaurantId, restaurantId),
        eq(digitizationJobs.status, 'UPLOADING'),
      ),
    )
    .returning(jobColumns);
  if (!discarded) {
    const job = await findJob(getDb(), restaurantId, jobId);
    if (!job) throw new ApiError(404, 'NOT_FOUND', JOB_NOT_FOUND);
    return toJobView(job);
  }
  await Promise.all(discarded.photoKeys.map(deleteBlobQuietly));
  return toJobView(discarded);
}

/**
 * The atomic claim of §E10: only an UPLOADING job with 1 to 5 photos becomes
 * PROCESSING, so a repeated or forged invocation finds nothing to do.
 */
export async function claimJob(restaurantId: string, jobId: string): Promise<string[] | null> {
  const [claimed] = await getDb()
    .update(digitizationJobs)
    .set({ startedAt: sql`now()`, status: 'PROCESSING' })
    .where(
      and(
        eq(digitizationJobs.id, jobId),
        eq(digitizationJobs.restaurantId, restaurantId),
        eq(digitizationJobs.status, 'UPLOADING'),
        sql`jsonb_array_length(${digitizationJobs.photoKeys}) between ${DIGITIZATION_LIMITS.minPhotos} and ${DIGITIZATION_LIMITS.maxPhotos}`,
      ),
    )
    .returning({ photoKeys: digitizationJobs.photoKeys });
  return claimed ? [...claimed.photoKeys].sort((a, b) => photoNumberOf(a) - photoNumberOf(b)) : null;
}

/** The photos of a claimed job, in their order. */
export async function readPhotos(keys: readonly string[]): Promise<{ data: Uint8Array; mimeType: ImageMimeType }[]> {
  return Promise.all(
    keys.map(async (key) => {
      const photo = await readImage(key);
      if (!photo) throw new Error(`Digitization photo ${key} is missing.`);
      return { data: new Uint8Array(photo.data), mimeType: photo.contentType };
    }),
  );
}

export async function failJob(jobId: string, errorCode: string): Promise<void> {
  await getDb()
    .update(digitizationJobs)
    .set({ errorCode, finishedAt: new Date(), status: 'FAILED' })
    .where(and(eq(digitizationJobs.id, jobId), inArray(digitizationJobs.status, ['UPLOADING', 'PROCESSING'])));
}

/**
 * Replaces the whole draft with the extracted menu, in one transaction (§E10):
 * the old sections go (and, by cascade, their products), the new ones come in
 * as LIST, with available products and no images, and the detected style is
 * saved. The job becomes SUCCEEDED in the same transaction. Returns the image
 * keys of the deleted products, to delete once committed. Null when the job is
 * no longer PROCESSING (the maintenance expired it meanwhile).
 */
export async function completeJob(
  restaurantId: string,
  jobId: string,
  menu: ExtractedMenu,
): Promise<string[] | null> {
  return getDb().transaction(async (tx) => {
    await tx.select({ id: restaurants.id }).from(restaurants).where(eq(restaurants.id, restaurantId)).for('update');
    const [job] = await tx
      .select({ status: digitizationJobs.status })
      .from(digitizationJobs)
      .where(and(eq(digitizationJobs.id, jobId), eq(digitizationJobs.restaurantId, restaurantId)))
      .for('update');
    if (job?.status !== 'PROCESSING') return null;

    const oldImages = await tx
      .select({ imageKey: products.imageKey })
      .from(products)
      .where(and(eq(products.restaurantId, restaurantId), isNotNull(products.imageKey)));
    await tx.delete(categories).where(eq(categories.restaurantId, restaurantId));

    for (const [categoryOrder, category] of menu.categories.entries()) {
      const [created] = await tx
        .insert(categories)
        .values({ layout: 'LIST', name: category.name, restaurantId, sortOrder: categoryOrder })
        .returning({ id: categories.id });
      if (!created) throw new Error('The section insert returned no row.');
      const createdProducts = await tx
        .insert(products)
        .values(
          category.products.map((product, sortOrder) => ({
            basePrice: product.basePrice,
            categoryId: created.id,
            description: product.description,
            isAvailable: true,
            name: product.name,
            restaurantId,
            sortOrder,
          })),
        )
        .returning({ id: products.id });
      const variants = category.products.flatMap((product, index) =>
        product.variants.map((item, sortOrder) => ({
          ...item,
          productId: createdProducts[index]?.id ?? '',
          restaurantId,
          sortOrder,
        })),
      );
      const extras = category.products.flatMap((product, index) =>
        product.extras.map((item, sortOrder) => ({
          ...item,
          productId: createdProducts[index]?.id ?? '',
          restaurantId,
          sortOrder,
        })),
      );
      if (variants.length > 0) await tx.insert(productVariants).values(variants);
      if (extras.length > 0) await tx.insert(productExtras).values(extras);
    }

    await tx.update(restaurants).set({ sourceStyle: menu.style }).where(eq(restaurants.id, restaurantId));
    await tx
      .update(digitizationJobs)
      .set({ errorCode: null, finishedAt: new Date(), status: 'SUCCEEDED' })
      .where(eq(digitizationJobs.id, jobId));
    return oldImages.map(({ imageKey }) => imageKey).filter((key): key is string => key !== null);
  });
}

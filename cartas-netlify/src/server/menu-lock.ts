import { and, eq, inArray } from 'drizzle-orm';

import { getDb, type Executor, type Transaction } from '../../db/index';
import { digitizationJobs, restaurants } from '../../db/schema';
import { ApiError } from './http';

export const DIGITIZATION_IN_PROGRESS_MESSAGE =
  'Estamos digitalizando tu carta. Podrás editarla en cuanto termine.';

export async function hasActiveDigitization(
  restaurantId: string,
  executor: Executor = getDb(),
): Promise<boolean> {
  const [job] = await executor
    .select({ id: digitizationJobs.id })
    .from(digitizationJobs)
    .where(
      and(
        eq(digitizationJobs.restaurantId, restaurantId),
        inArray(digitizationJobs.status, ['UPLOADING', 'PROCESSING']),
      ),
    )
    .limit(1);
  return Boolean(job);
}

/** §E7: while a digitization job is UPLOADING or PROCESSING, the menu cannot change. */
export async function assertNoActiveDigitization(
  restaurantId: string,
  executor: Executor = getDb(),
): Promise<void> {
  if (await hasActiveDigitization(restaurantId, executor)) {
    throw new ApiError(409, 'DIGITIZATION_IN_PROGRESS', DIGITIZATION_IN_PROGRESS_MESSAGE);
  }
}

/**
 * Runs a change of the menu draft in one transaction. It first locks the
 * restaurant row, which a new digitization job also locks, so a job can never
 * start halfway through an edit; then it applies the §E7 lock.
 */
export async function withMenuEdit<Result>(
  restaurantId: string,
  edit: (tx: Transaction) => Promise<Result>,
): Promise<Result> {
  return getDb().transaction(async (tx) => {
    await tx
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .for('update');
    await assertNoActiveDigitization(restaurantId, tx);
    return edit(tx);
  });
}

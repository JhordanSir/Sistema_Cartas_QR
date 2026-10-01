import type { Config } from '@netlify/functions';

import { describeErrorForLog } from '../../src/server/db-errors';
import { expireStaleJobs } from '../../src/server/digitization/jobs';
import { consolidateOldViews } from '../../src/server/views';

/** Scheduled functions stop at 30 s; the work stops at 20 s to leave a margin. */
const TIME_BUDGET_MS = 20_000;
const BATCH_SIZE = 50;

/**
 * Daily at 04:15 in Lima, in batches and never past the time budget:
 * - §E10: jobs PROCESSING for more than 20 minutes or UPLOADING for more than
 *   60 become FAILED and their photos are deleted.
 * - §E11: visits older than 30 days are summed into view_summaries and deleted.
 */
export default async function maintenance(): Promise<void> {
  const deadline = Date.now() + TIME_BUDGET_MS;
  const expiredJobs = await inBatches('expire stale digitization jobs', deadline, () =>
    expireStaleJobs({ limit: BATCH_SIZE }),
  );
  const consolidatedDays = await inBatches('consolidate old visits', deadline, () =>
    consolidateOldViews({ limit: BATCH_SIZE }),
  );
  console.log(
    `Maintenance: ${expiredJobs} stale digitization job(s) expired, ${consolidatedDays} restaurant-day(s) of visits consolidated.`,
  );
}

/** Repeats a batch until one comes back short or time runs out. A failure only stops that task. */
async function inBatches(task: string, deadline: number, runBatch: () => Promise<number>): Promise<number> {
  let done = 0;
  try {
    while (Date.now() < deadline) {
      const count = await runBatch();
      done += count;
      if (count < BATCH_SIZE) break;
    }
  } catch (error) {
    console.error(`Maintenance could not ${task}`, describeErrorForLog(error));
  }
  return done;
}

export const config: Config = { schedule: '15 9 * * *' };

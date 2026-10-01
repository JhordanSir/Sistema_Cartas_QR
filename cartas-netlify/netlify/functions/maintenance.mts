import type { Config } from '@netlify/functions';

import { describeErrorForLog } from '../../src/server/db-errors';
import { expireStaleJobs } from '../../src/server/digitization/jobs';

/** Scheduled functions stop at 30 s; the work stops at 20 s to leave a margin. */
const TIME_BUDGET_MS = 20_000;
const BATCH_SIZE = 50;

/**
 * Daily at 04:15 in Lima (§E10): jobs PROCESSING for more than 20 minutes or
 * UPLOADING for more than 60 become FAILED and their photos are deleted. In
 * batches, and never past the time budget.
 */
export default async function maintenance(): Promise<void> {
  const deadline = Date.now() + TIME_BUDGET_MS;
  let expiredJobs = 0;
  try {
    while (Date.now() < deadline) {
      const expired = await expireStaleJobs({ limit: BATCH_SIZE });
      expiredJobs += expired;
      if (expired < BATCH_SIZE) break;
    }
  } catch (error) {
    console.error('Maintenance failed', describeErrorForLog(error));
  }
  console.log(`Maintenance: ${expiredJobs} stale digitization job(s) expired.`);
}

export const config: Config = { schedule: '15 9 * * *' };

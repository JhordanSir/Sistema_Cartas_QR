import { and, eq, gt, lt, or, type SQL } from 'drizzle-orm';

import { digitizationJobs } from '../../../db/schema';
import { STALE_PROCESSING_MS, STALE_UPLOADING_MS } from '../../shared/digitization';

/**
 * A job that still counts as running: UPLOADING for less than an hour or
 * PROCESSING for less than 20 minutes (§E10). An older one is abandoned and
 * must not keep the menu locked until the daily maintenance.
 */
export function freshActiveJob(now: Date): SQL {
  return or(
    and(
      eq(digitizationJobs.status, 'UPLOADING'),
      gt(digitizationJobs.createdAt, new Date(now.getTime() - STALE_UPLOADING_MS)),
    ),
    and(
      eq(digitizationJobs.status, 'PROCESSING'),
      gt(digitizationJobs.startedAt, new Date(now.getTime() - STALE_PROCESSING_MS)),
    ),
  ) as SQL;
}

/** The opposite: active by status, but past its time. */
export function staleActiveJob(now: Date): SQL {
  return or(
    and(
      eq(digitizationJobs.status, 'UPLOADING'),
      lt(digitizationJobs.createdAt, new Date(now.getTime() - STALE_UPLOADING_MS)),
    ),
    and(
      eq(digitizationJobs.status, 'PROCESSING'),
      lt(digitizationJobs.startedAt, new Date(now.getTime() - STALE_PROCESSING_MS)),
    ),
  ) as SQL;
}

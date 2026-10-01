import { sql } from 'drizzle-orm';

import { getDb } from '../../db/index';
import { describeErrorForLog } from './db-errors';

/** Runs `select 1`. Failures are logged on the server and never exposed. */
export async function isDatabaseUp(): Promise<boolean> {
  try {
    await getDb().execute(sql`select 1`);
    return true;
  } catch (error) {
    console.error('Database health check failed', describeErrorForLog(error));
    return false;
  }
}

import { sql } from 'drizzle-orm';

import { getDb } from '../../db/index';

/** Runs `select 1`. Failures are logged on the server and never exposed. */
export async function isDatabaseUp(): Promise<boolean> {
  try {
    await getDb().execute(sql`select 1`);
    return true;
  } catch (error) {
    console.error('Database health check failed', error);
    return false;
  }
}

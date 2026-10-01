// Applies the migrations to, or resets, the LOCAL database of a running
// `netlify dev`. netlify-cli's own `netlify database …` commands resolve this
// app to the repository root (the root has its own package.json), so they look
// for the migrations and the database in the wrong place. This script uses the
// same library those commands use, against the database `netlify dev` started.
//
//   node scripts/local-db.ts apply   → applies pending migrations
//   node scripts/local-db.ts reset   → drops everything, then applies all migrations
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyMigrations, resetDatabase, type SQLExecutor } from '@netlify/database-dev';
import pg from 'pg';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const statePath = join(appRoot, '.netlify', 'state.json');
const migrationsDirectory = join(appRoot, 'netlify', 'database', 'migrations');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

async function readLocalConnectionString(): Promise<string> {
  let state: unknown = {};
  try {
    state = JSON.parse(await readFile(statePath, 'utf8'));
  } catch {
    // No state file yet: handled below.
  }
  const value =
    typeof state === 'object' && state !== null && 'dbConnectionString' in state
      ? state.dbConnectionString
      : undefined;
  if (typeof value !== 'string') {
    throw new Error('No local database is running. Start it first with `pnpm dev:netlify`.');
  }
  // This script must never touch a hosted database.
  if (!LOCAL_HOSTS.has(new URL(value).hostname)) {
    throw new Error('Refusing to continue: the database in .netlify/state.json is not local.');
  }
  return value;
}

function createExecutor(client: pg.Client): SQLExecutor {
  const executor: SQLExecutor = {
    async exec(sql) {
      await client.query(sql);
    },
    async query<T>(sql: string, params?: unknown[]) {
      const result = await client.query(sql, params);
      return { rows: result.rows as T[] };
    },
    async transaction(fn) {
      await client.query('BEGIN');
      try {
        const result = await fn(executor);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    },
  };
  return executor;
}

async function main(action: string | undefined): Promise<void> {
  if (action !== 'apply' && action !== 'reset') {
    throw new Error('Usage: node scripts/local-db.ts <apply|reset>');
  }
  const client = new pg.Client({ connectionString: await readLocalConnectionString() });
  await client.connect();
  try {
    const executor = createExecutor(client);
    if (action === 'reset') {
      await resetDatabase(executor);
      console.log('Local database reset.');
    }
    const applied = await applyMigrations(executor, migrationsDirectory);
    console.log(
      applied.length === 0
        ? 'No pending migrations.'
        : `Applied ${applied.length} migration(s): ${applied.join(', ')}`,
    );
  } finally {
    await client.end();
  }
}

main(process.argv[2]).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

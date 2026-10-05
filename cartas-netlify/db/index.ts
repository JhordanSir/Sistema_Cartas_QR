import { getConnectionString } from '@netlify/database';
import { drizzle } from 'drizzle-orm/netlify-db';
import type { PgAsyncDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import pg from 'pg';

/** Drizzle client shared by Server Components, Route Handlers and Netlify Functions. */
export type Database = PgAsyncDatabase<PgQueryResultHKT>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
/** Anything that can run queries: the client itself or an open transaction. */
export type Executor = Database | Transaction;

const globalCache = globalThis as typeof globalThis & { sirioDatabase?: Database };

/**
 * Always TCP through `pg`, with the connection string of @netlify/database, as
 * Netlify documents for using your own driver:
 * - In Netlify Functions, `getDatabase()` hands over its HTTP driver, which
 *   drizzle-orm 1.0.0-rc.4 (netlify-db) calls as a plain function, and the
 *   @neondatabase/serverless it brings only accepts tagged templates: every
 *   query failed in production.
 * - Under `netlify dev` it reaches a local PGlite that answers every socket from
 *   a single session, so concurrent connections would interleave their
 *   statements and transactions. One connection serializes them, and the
 *   timeout turns a query issued on `db` inside a transaction into an error
 *   instead of a hang. In a function, one request runs at a time per instance.
 */
function createDatabase(): Database {
  const connectionString = getConnectionString();
  const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
  // An idle connection can drop while the function sleeps between requests;
  // without a listener that error would crash the instance. The pool reconnects.
  pool.on('error', (error) => {
    console.error('Idle database connection closed', error.message);
  });
  return drizzle({ client: { driver: 'server', pool, connectionString } });
}

/**
 * Lazily creates the client on first use, so importing this module never needs
 * NETLIFY_DB_URL (for example while `next build` collects page data). The
 * instance lives on globalThis so hot reloads in development reuse it.
 */
export function getDb(): Database {
  globalCache.sirioDatabase ??= createDatabase();
  return globalCache.sirioDatabase;
}

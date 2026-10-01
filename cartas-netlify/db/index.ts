import { getDatabase } from '@netlify/database';
import { drizzle } from 'drizzle-orm/netlify-db';
import type { PgAsyncDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import pg from 'pg';

/** Drizzle client shared by Server Components, Route Handlers and Netlify Functions. */
export type Database = PgAsyncDatabase<PgQueryResultHKT>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
/** Anything that can run queries: the client itself or an open transaction. */
export type Executor = Database | Transaction;

const globalCache = globalThis as typeof globalThis & { sirioDatabase?: Database };

function createDatabase(): Database {
  const connection = getDatabase();
  if (connection.driver === 'serverless') {
    return drizzle({ client: connection });
  }
  // TCP driver. Under `netlify dev` it reaches a local PGlite that answers every
  // socket from a single session, so concurrent connections would interleave
  // their statements and transactions. One connection serializes them; the
  // timeout turns a query issued on `db` inside a transaction into an error
  // instead of a hang. The default pool was just created and never connected.
  void connection.pool.end();
  const pool = new pg.Pool({
    connectionString: connection.connectionString,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
  return drizzle({
    client: { driver: 'server', pool, connectionString: connection.connectionString },
  });
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

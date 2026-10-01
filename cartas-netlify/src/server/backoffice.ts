import { randomInt } from 'node:crypto';

import { count, desc, eq, ilike, or } from 'drizzle-orm';

import { getDb } from '../../db/index';
import { accounts, digitizationJobs, restaurants } from '../../db/schema';
import {
  BACKOFFICE_PAGE_SIZE,
  deletePhrase,
  type BackofficeList,
  type RestaurantStatus,
} from '../shared/backoffice';
import { generateTemporaryPassword } from '../shared/temporary-password';
import { deleteBlobQuietly, deleteRestaurantBlobs } from './blobs';
import { ApiError, validationError } from './http';
import { hashPassword } from './password';
import { revokeAllSessions } from './session';

// The backoffice (§E12). Only restaurants are listed and changed: the
// administrator's account has none, so it can never be paused or deleted.

export const RESTAURANT_NOT_FOUND = 'No encontramos ese restaurante.';

/** `%`, `_` and `\` in the search match literally inside the ILIKE pattern. */
export function containsPattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, '\\$&')}%`;
}

/** By name, slug or owner's email, newest first, 20 per page. */
export async function listRestaurants({ page, query }: { page: number; query: string }): Promise<BackofficeList> {
  const db = getDb();
  const pattern = containsPattern(query);
  const matches = query
    ? or(ilike(restaurants.name, pattern), ilike(restaurants.slug, pattern), ilike(accounts.email, pattern))
    : undefined;

  const [counted] = await db
    .select({ total: count() })
    .from(restaurants)
    .innerJoin(accounts, eq(accounts.id, restaurants.ownerAccountId))
    .where(matches);
  const total = counted?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / BACKOFFICE_PAGE_SIZE));
  const current = Math.min(page, pageCount);

  const rows = await db
    .select({
      createdAt: restaurants.createdAt,
      id: restaurants.id,
      name: restaurants.name,
      ownerEmail: accounts.email,
      slug: restaurants.slug,
      status: restaurants.status,
    })
    .from(restaurants)
    .innerJoin(accounts, eq(accounts.id, restaurants.ownerAccountId))
    .where(matches)
    .orderBy(desc(restaurants.createdAt), desc(restaurants.id))
    .limit(BACKOFFICE_PAGE_SIZE)
    .offset((current - 1) * BACKOFFICE_PAGE_SIZE);

  return {
    page: current,
    pageCount,
    restaurants: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    total,
  };
}

async function findRestaurant(id: string) {
  const [row] = await getDb()
    .select({
      id: restaurants.id,
      ownerAccountId: restaurants.ownerAccountId,
      ownerEmail: accounts.email,
      slug: restaurants.slug,
    })
    .from(restaurants)
    .innerJoin(accounts, eq(accounts.id, restaurants.ownerAccountId))
    .where(eq(restaurants.id, id))
    .limit(1);
  if (!row) throw new ApiError(404, 'NOT_FOUND', RESTAURANT_NOT_FOUND);
  return row;
}

/** Pauses or reactivates. Returns the slug: the caller invalidates its cached menu. */
export async function setRestaurantStatus(id: string, status: RestaurantStatus): Promise<string> {
  const [row] = await getDb()
    .update(restaurants)
    .set({ status })
    .where(eq(restaurants.id, id))
    .returning({ slug: restaurants.slug });
  if (!row) throw new ApiError(404, 'NOT_FOUND', RESTAURANT_NOT_FOUND);
  return row.slug;
}

/**
 * Only with the exact phrase and the box ticked. The blobs go first, then the
 * owner's account: the database cascades to the restaurant and all its data,
 * sessions included. Returns the slug, for the cache.
 */
export async function deleteRestaurant(
  id: string,
  { confirmation, understood }: { confirmation: string; understood: boolean },
): Promise<string> {
  const restaurant = await findRestaurant(id);
  const phrase = deletePhrase(restaurant.slug);
  const fields: Record<string, string> = {};
  if (confirmation !== phrase) fields.confirmation = `Escribe exactamente ${phrase}.`;
  if (!understood) fields.understood = 'Marca la casilla para confirmar.';
  if (Object.keys(fields).length > 0) throw validationError(fields);

  const db = getDb();
  const jobs = await db
    .select({ photoKeys: digitizationJobs.photoKeys })
    .from(digitizationJobs)
    .where(eq(digitizationJobs.restaurantId, restaurant.id));
  await deleteRestaurantBlobs(restaurant.id);
  // Photos of a digitization still running are keyed by job, not by restaurant.
  await Promise.all(jobs.flatMap(({ photoKeys }) => photoKeys).map(deleteBlobQuietly));
  await db.delete(accounts).where(eq(accounts.id, restaurant.ownerAccountId));
  return restaurant.slug;
}

/**
 * A new password for the owner, shown once: they must change it when they
 * sign in, and every session they had ends.
 */
export async function setTemporaryPassword(id: string): Promise<{ email: string; password: string }> {
  const restaurant = await findRestaurant(id);
  const password = generateTemporaryPassword((max) => randomInt(max));
  const passwordHash = await hashPassword(password);
  await getDb().transaction(async (tx) => {
    await tx
      .update(accounts)
      .set({ mustChangePassword: true, passwordHash })
      .where(eq(accounts.id, restaurant.ownerAccountId));
    await revokeAllSessions(restaurant.ownerAccountId, tx);
  });
  return { email: restaurant.ownerEmail, password };
}

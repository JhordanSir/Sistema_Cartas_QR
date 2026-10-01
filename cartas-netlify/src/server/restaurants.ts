import { eq } from 'drizzle-orm';

import { getDb } from '../../db/index';
import { restaurants } from '../../db/schema';

export type OwnerRestaurant = {
  id: string;
  name: string;
  slug: string;
  status: 'ENABLED' | 'DISABLED';
};

/** The restaurant of an owner account: always from the session, never from the client (§E4). */
export async function findRestaurantByOwner(accountId: string): Promise<OwnerRestaurant | null> {
  const [row] = await getDb()
    .select({
      id: restaurants.id,
      name: restaurants.name,
      slug: restaurants.slug,
      status: restaurants.status,
    })
    .from(restaurants)
    .where(eq(restaurants.ownerAccountId, accountId))
    .limit(1);
  return row ?? null;
}

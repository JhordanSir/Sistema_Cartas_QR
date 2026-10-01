import { eq } from 'drizzle-orm';

import { getDb } from '../../db/index';
import { restaurants } from '../../db/schema';
import type { ProfileFields, ProfileView } from '../shared/profile';
import { buildPublicMenuUrl, normalizePublicAppUrl } from '../shared/qr';
import { mediaUrl } from './blobs';

export type RestaurantProfile = ProfileFields & {
  slug: string;
  logoKey: string | null;
};

const profileColumns = {
  address: restaurants.address,
  contactPhone: restaurants.contactPhone,
  facebookUrl: restaurants.facebookUrl,
  instagramUrl: restaurants.instagramUrl,
  logoKey: restaurants.logoKey,
  name: restaurants.name,
  slug: restaurants.slug,
  tiktokUrl: restaurants.tiktokUrl,
  whatsapp: restaurants.whatsapp,
};

export async function getProfile(restaurantId: string): Promise<RestaurantProfile | null> {
  const [row] = await getDb()
    .select(profileColumns)
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId))
    .limit(1);
  return row ?? null;
}

export function toProfileView(profile: RestaurantProfile): ProfileView {
  const { logoKey, ...fields } = profile;
  const publicAppUrl = normalizePublicAppUrl(process.env.PUBLIC_APP_URL);
  return {
    ...fields,
    logoUrl: logoKey ? mediaUrl(logoKey) : null,
    publicUrl: publicAppUrl ? buildPublicMenuUrl(publicAppUrl, profile.slug) : null,
  };
}

/**
 * Saves the profile. `logoKey` undefined keeps the current logo, null removes
 * it, a string replaces it. Returns the previous logo key so the caller can
 * delete that blob once this change is committed (§E6). The slug never changes.
 */
export async function saveProfile(
  restaurantId: string,
  fields: ProfileFields,
  logoKey: string | null | undefined,
): Promise<{ profile: RestaurantProfile; previousLogoKey: string | null }> {
  return getDb().transaction(async (tx) => {
    const [current] = await tx
      .select({ logoKey: restaurants.logoKey })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .for('update');
    if (!current) throw new Error(`Restaurant ${restaurantId} does not exist.`);

    const [profile] = await tx
      .update(restaurants)
      .set({ ...fields, ...(logoKey === undefined ? {} : { logoKey }) })
      .where(eq(restaurants.id, restaurantId))
      .returning(profileColumns);
    if (!profile) throw new Error(`Restaurant ${restaurantId} vanished while saving.`);

    return { previousLogoKey: current.logoKey, profile };
  });
}

import { eq } from 'drizzle-orm';

import { getDb } from '../../db/index';
import { restaurants } from '../../db/schema';
import { parseMenuSnapshot, type MenuSnapshot } from '../shared/menu-snapshot';
import { mediaUrl } from './blobs';

/** What /{slug} needs (§E8). Only plain JSON: it goes through Next's data cache. */
export type PublicMenu =
  | { kind: 'missing' }
  | {
      kind: 'menu';
      restaurant: {
        name: string;
        slug: string;
        logoUrl: string | null;
        address: string | null;
        contactPhone: string | null;
        whatsapp: string | null;
        instagramUrl: string | null;
        facebookUrl: string | null;
        tiktokUrl: string | null;
      };
      /** Null while the restaurant has never published: «Próximamente». */
      snapshot: MenuSnapshot | null;
    };

/**
 * A slug that does not exist and a DISABLED restaurant look the same to a
 * diner: the 404 «Esta carta no está disponible.». The published snapshot is
 * all that is shown of the menu; the draft never is.
 */
export async function loadPublicMenu(slug: string): Promise<PublicMenu> {
  const [row] = await getDb()
    .select({
      address: restaurants.address,
      contactPhone: restaurants.contactPhone,
      facebookUrl: restaurants.facebookUrl,
      instagramUrl: restaurants.instagramUrl,
      logoKey: restaurants.logoKey,
      name: restaurants.name,
      publishedMenu: restaurants.publishedMenu,
      slug: restaurants.slug,
      status: restaurants.status,
      tiktokUrl: restaurants.tiktokUrl,
      whatsapp: restaurants.whatsapp,
    })
    .from(restaurants)
    .where(eq(restaurants.slug, slug))
    .limit(1);
  if (!row || row.status !== 'ENABLED') return { kind: 'missing' };

  return {
    kind: 'menu',
    restaurant: {
      address: row.address,
      contactPhone: row.contactPhone,
      facebookUrl: row.facebookUrl,
      instagramUrl: row.instagramUrl,
      logoUrl: row.logoKey ? mediaUrl(row.logoKey) : null,
      name: row.name,
      slug: row.slug,
      tiktokUrl: row.tiktokUrl,
      whatsapp: row.whatsapp,
    },
    snapshot: parseMenuSnapshot(row.publishedMenu),
  };
}

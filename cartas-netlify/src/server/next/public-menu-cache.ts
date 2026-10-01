import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';

import { normalizeSlug, SLUG_BASE_MAX_LENGTH } from '../../shared/slug';
import { loadPublicMenu, type PublicMenu } from '../public-menu';

// Cache of the public menu (§E2): one entry per slug, tagged `menu:{slug}`.
// unstable_cache instead of 'use cache': Cache Components would change how
// every page of the panel renders, and the specification allows either.

export function menuTag(slug: string): string {
  return `menu:${slug}`;
}

/**
 * The public menu of a slug. Anything that could never be a slug answers
 * "missing" without touching the database or creating a cache entry.
 */
export async function getPublicMenu(slug: string): Promise<PublicMenu> {
  if (slug !== normalizeSlug(slug) || [...slug].length > SLUG_BASE_MAX_LENGTH + 10) {
    return { kind: 'missing' };
  }
  return unstable_cache(() => loadPublicMenu(slug), ['public-menu', slug], {
    tags: [menuTag(slug)],
  })();
}

/**
 * After publishing, editing the profile, changing the template, pausing,
 * reactivating or deleting (§E2). `expire: 0`: the next visit renders fresh
 * instead of serving the old menu once more. The path is revalidated too, so a
 * cached 404 page for that slug (a brand-new restaurant) also goes away.
 */
export function invalidatePublicMenu(slug: string): void {
  revalidateTag(menuTag(slug), { expire: 0 });
  revalidatePath(`/${slug}`);
}

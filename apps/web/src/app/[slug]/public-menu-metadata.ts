import type { Metadata } from 'next';

import type { PublicMenuCopy } from '@/i18n/messages/public-menu';
import type { PublicRestaurant } from '@/lib/restaurant-types';

/**
 * Title, description and Open Graph for a public menu. They follow the visitor's
 * language cookie; link previews and search crawlers send no cookie and get Spanish.
 */
export function publicMenuMetadata(
  restaurant: Pick<PublicRestaurant, 'address' | 'name'> | null,
  copy: PublicMenuCopy['metadata'],
): Metadata {
  if (!restaurant) return { title: copy.unavailableTitle };

  const title = copy.title(restaurant.name);
  const description = restaurant.address
    ? copy.descriptionWithAddress(restaurant.name, restaurant.address)
    : copy.description(restaurant.name);

  return {
    description,
    openGraph: { description, locale: copy.openGraphLocale, title, type: 'website' },
    title,
  };
}

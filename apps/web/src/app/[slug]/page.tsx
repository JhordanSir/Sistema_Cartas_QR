import { notFound } from 'next/navigation';

import { apiInternalUrl } from '@/lib/api-server';
import type { PublicRestaurant } from '@/lib/restaurant-types';

export default async function PublicRestaurantPage({
  params,
}: PageProps<'/[slug]'>) {
  const { slug } = await params;
  const response = await fetch(
    `${apiInternalUrl()}/api/restaurants/public/${encodeURIComponent(slug)}`,
    { cache: 'no-store' },
  );
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error('Restaurant menu could not be loaded');
  const restaurant = (await response.json()) as PublicRestaurant;

  return (
    <main
      className="public-menu-shell"
      style={{
        '--menu-background': restaurant.backgroundColor,
        '--menu-foreground': restaurant.textColor,
        '--menu-font': restaurant.fontFamily,
      } as React.CSSProperties}
    >
      <section className="public-menu-card">
        <span className="menu-kicker">Carta digital</span>
        <h1>{restaurant.name}</h1>
        <div className="menu-placeholder">
          <span aria-hidden="true">✦</span>
          <h2>Estamos preparando la carta</h2>
          <p>Muy pronto encontrarás aquí todos los productos del restaurante.</p>
        </div>
      </section>
    </main>
  );
}

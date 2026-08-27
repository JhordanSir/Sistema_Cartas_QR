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
        {restaurant.categories.length === 0 ? (
          <div className="menu-placeholder">
            <span aria-hidden="true">✦</span>
            <h2>Estamos preparando la carta</h2>
            <p>Muy pronto encontrarás aquí todos los productos del restaurante.</p>
          </div>
        ) : (
          <div className="published-menu">
            {restaurant.categories.map((category) => (
              <section className="public-menu-category" key={category.id}>
                <h2>{category.name}</h2>
                <div className="public-product-list">
                  {category.products.map((product) => (
                    <article className={`public-product${product.hasImage ? ' has-image' : ''}`} key={product.id}>
                      {product.hasImage ? (
                        // Product images are served from the same public origin and sized by CSS.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt={product.name}
                          className="public-product-image"
                          src={`/api/public/restaurants/${encodeURIComponent(restaurant.slug)}/products/${product.id}/image`}
                        />
                      ) : null}
                      <div className="public-product-copy">
                        <div className="public-product-heading">
                          <h3>{product.name}</h3>
                          <strong>S/ {product.basePrice}</strong>
                        </div>
                        {product.description ? <p>{product.description}</p> : null}
                        {product.variants.length > 0 ? (
                          <div className="public-options">
                            <span>Presentaciones</span>
                            {product.variants.map((variant) => (
                              <small key={variant.id}>{variant.name} · S/ {variant.price}</small>
                            ))}
                          </div>
                        ) : null}
                        {product.extras.length > 0 ? (
                          <div className="public-options">
                            <span>Adicionales</span>
                            {product.extras.map((extra) => (
                              <small key={extra.id}>{extra.name} · S/ {extra.price}</small>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

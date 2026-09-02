import { notFound } from 'next/navigation';

import { apiInternalUrl } from '@/lib/api-server';
import type { PublicRestaurant } from '@/lib/restaurant-types';

import { PublicViewTracker } from './public-view-tracker';

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
      <PublicViewTracker slug={restaurant.slug} />
      <section className="public-menu-card">
        <header className="public-menu-masthead">
          <div className="public-menu-overline">
            <span className="menu-kicker">Carta digital</span>
            <span className="menu-live-mark"><i /> {restaurant.categories.length ? 'Carta publicada' : 'Próximamente'}</span>
          </div>
          <h1>{restaurant.name}</h1>
          {restaurant.categories.length > 0 ? (
            <p>Elige una sección y encuentra tu próximo favorito.</p>
          ) : null}
        </header>
        {restaurant.categories.length === 0 ? (
          <div className="menu-placeholder">
            <span aria-hidden="true">✦</span>
            <h2>Estamos preparando la carta</h2>
            <p>Muy pronto encontrarás aquí todos los productos del restaurante.</p>
          </div>
        ) : (
          <>
            {restaurant.categories.length > 1 ? (
              <nav aria-label="Secciones de la carta" className="public-category-index">
                <span className="public-category-index-label">Secciones</span>
                <div>
                  {restaurant.categories.map((category, index) => (
                    <a href={`#categoria-${category.id}`} key={category.id}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      {category.name}
                    </a>
                  ))}
                </div>
              </nav>
            ) : null}
            <div className="published-menu">
            {restaurant.categories.map((category, index) => (
              <section
                className="public-menu-category"
                id={`categoria-${category.id}`}
                key={category.id}
              >
                <header className="public-category-heading">
                  <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <h2>{category.name}</h2>
                </header>
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
                            <ul>
                              {product.variants.map((variant) => (
                                <li key={variant.id}>{variant.name} <b>S/ {variant.price}</b></li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {product.extras.length > 0 ? (
                          <div className="public-options">
                            <span>Adicionales</span>
                            <ul>
                              {product.extras.map((extra) => (
                                <li key={extra.id}>{extra.name} <b>S/ {extra.price}</b></li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
            </div>
          </>
        )}
        <footer className="public-menu-footer">
          <span aria-hidden="true">S</span>
          Carta digital publicada con Sirio
        </footer>
      </section>
    </main>
  );
}

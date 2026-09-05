import { notFound } from 'next/navigation';

import { apiInternalUrl } from '@/lib/api-server';
import { menuFontClassName } from '@/lib/menu-fonts';
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
      className={`menu-themed relative isolate grid min-h-dvh justify-items-center overflow-hidden sm:p-6 lg:p-12 ${menuFontClassName(restaurant.fontFamily)}`}
      style={{
        '--menu-background': restaurant.backgroundColor,
        '--menu-foreground': restaurant.textColor,
      } as React.CSSProperties}
    >
      <PublicViewTracker slug={restaurant.slug} />
      <section className="relative w-full max-w-[51.25rem] self-start bg-[color-mix(in_srgb,var(--menu-background)_94%,white)] px-6 pt-8 pb-10 sm:rounded-t-[1.875rem] sm:rounded-b-[1.125rem] sm:border sm:border-current/10 sm:px-10 sm:py-12 sm:shadow-[0_1px_2px_color-mix(in_srgb,var(--menu-foreground)_5%,transparent),0_1.125rem_2.625rem_color-mix(in_srgb,var(--menu-foreground)_8%,transparent)] lg:px-18">
        <span
          aria-hidden="true"
          className="absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-current/70 sm:inset-x-10 lg:inset-x-18"
        />

        <header className="border-b border-current/20 pt-3 pb-8">
          <div className="flex items-start justify-between gap-4">
            <span className="text-[11px] font-extrabold tracking-[0.14em] uppercase opacity-80">
              Carta digital
            </span>
            <span className="inline-flex min-h-7 shrink-0 items-center gap-2 rounded-full border border-current/15 px-2.5 py-1.5 text-[9px] font-extrabold tracking-[0.09em] uppercase opacity-80">
              <i
                aria-hidden="true"
                className="size-1.5 rounded-full bg-current shadow-[0_0_0_3px_color-mix(in_srgb,currentColor_15%,transparent)]"
              />
              {restaurant.categories.length ? 'Carta publicada' : 'Próximamente'}
            </span>
          </div>
          <h1 className="mt-5 mb-3 max-w-[14ch] text-4xl leading-[0.98] font-semibold tracking-[-0.045em] wrap-anywhere sm:text-5xl lg:text-6xl">
            {restaurant.name}
          </h1>
          {restaurant.categories.length > 0 ? (
            <p className="m-0 max-w-[48ch] text-[13px]/relaxed opacity-75 text-pretty">
              Elige una sección y encuentra tu próximo favorito.
            </p>
          ) : null}
        </header>

        {restaurant.categories.length === 0 ? (
          <div className="pt-8 pb-2">
            <span aria-hidden="true" className="text-2xl">
              ✦
            </span>
            <h2 className="my-1.5 font-semibold tracking-[-0.025em]">
              Estamos preparando la carta
            </h2>
            <p className="m-0 text-sm/normal opacity-75">
              Muy pronto encontrarás aquí todos los productos del restaurante.
            </p>
          </div>
        ) : (
          <>
            {restaurant.categories.length > 1 ? (
              <nav
                aria-label="Secciones de la carta"
                className="sticky top-0 z-10 -mx-6 mt-5 grid gap-1.5 border-y border-current/12 bg-[color-mix(in_srgb,var(--menu-background)_90%,white)] px-4 py-2 backdrop-blur-md sm:top-4 sm:mx-0 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-3 sm:rounded-xl sm:border"
              >
                <span className="shrink-0 px-1 text-[9px] font-black tracking-[0.12em] uppercase opacity-60">
                  Secciones
                </span>
                <div className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto">
                  {restaurant.categories.map((category, index) => (
                    <a
                      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-2.5 text-[11px] font-bold no-underline transition-colors hover:bg-current/10 active:scale-[0.97]"
                      href={`#categoria-${category.id}`}
                      key={category.id}
                    >
                      <span className="text-[9px] tabular-nums opacity-55">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {category.name}
                    </a>
                  ))}
                </div>
              </nav>
            ) : null}

            <div className="grid gap-11 pt-10 sm:gap-13">
              {restaurant.categories.map((category, index) => (
                <section
                  className="scroll-mt-24"
                  id={`categoria-${category.id}`}
                  key={category.id}
                >
                  <header className="grid grid-cols-[1.875rem_minmax(0,1fr)] items-center gap-2.5 border-b border-current/25 pb-3.5 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-3">
                    <span
                      aria-hidden="true"
                      className="grid size-6.5 place-items-center rounded-full border border-current/25 text-[10px] tabular-nums sm:size-7.5"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h2 className="m-0 text-[15px] tracking-[0.11em] uppercase">{category.name}</h2>
                  </header>

                  <div className="grid">
                    {category.products.map((product) => (
                      <article
                        className={`border-b border-current/12 py-5 sm:py-6 ${
                          product.hasImage
                            ? 'grid grid-cols-[5.25rem_minmax(0,1fr)] items-start gap-3.5 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-5'
                            : ''
                        }`}
                        key={product.id}
                      >
                        {product.hasImage ? (
                          // Product images are served from the same public origin and sized by CSS.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={product.name}
                            className="block aspect-square w-full rounded-2xl border border-current/15 object-cover"
                            src={`/api/public/restaurants/${encodeURIComponent(restaurant.slug)}/products/${product.id}/image`}
                          />
                        ) : null}
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-2.5 sm:items-baseline sm:gap-4">
                            <h3 className="m-0 text-[17px] tracking-[-0.02em] sm:text-[19px]">
                              {product.name}
                            </h3>
                            <strong className="shrink-0 rounded-md bg-current/8 px-1.5 py-1 text-xs whitespace-nowrap tabular-nums sm:text-[13px]">
                              S/ {product.basePrice}
                            </strong>
                          </div>
                          {product.description ? (
                            <p className="mt-2 mb-0 max-w-[54ch] text-[13px]/normal opacity-75">
                              {product.description}
                            </p>
                          ) : null}
                          {product.variants.length > 0 ? (
                            <OptionList items={product.variants} title="Presentaciones" />
                          ) : null}
                          {product.extras.length > 0 ? (
                            <OptionList items={product.extras} title="Adicionales" />
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

        <footer className="flex items-center justify-center gap-2 pt-11 text-[9px] font-bold tracking-[0.08em] uppercase opacity-50">
          <span
            aria-hidden="true"
            className="grid size-5.5 place-items-center rounded-md bg-[var(--menu-foreground)] text-xs text-[var(--menu-background)]"
          >
            S
          </span>
          Carta digital publicada con Sirio
        </footer>
      </section>
    </main>
  );
}

function OptionList({
  items,
  title,
}: {
  items: Array<{ id?: string; name: string; price: string }>;
  title: string;
}) {
  return (
    <div className="mt-3.5 grid gap-1.5 text-[11px]">
      <span className="w-full text-[9px] font-extrabold tracking-[0.1em] uppercase opacity-60">
        {title}
      </span>
      <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1.5 p-0">
        {items.map((item) => (
          <li className="text-[11px]" key={item.id ?? item.name}>
            {item.name} <b className="ml-0.5 tabular-nums">S/ {item.price}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

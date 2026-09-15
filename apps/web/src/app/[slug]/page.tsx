import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { formatCurrency } from '@/i18n/format';
import type { Locale } from '@/i18n/locale';
import { type PublicMenuCopy, publicMenuCopy } from '@/i18n/messages/public-menu';
import { getLocale } from '@/i18n/server';
import { apiInternalUrl } from '@/lib/api-server';
import { socialLinks, telHref, whatsappHref } from '@/lib/contact';
import { menuFontClassName } from '@/lib/menu-fonts';
import type { PublicRestaurant } from '@/lib/restaurant-types';

import { publicMenuMetadata } from './public-menu-metadata';
import { PublicViewTracker } from './public-view-tracker';

/**
 * Cached per request so generateMetadata and the page itself share one API call.
 */
const loadRestaurant = cache(async (slug: string): Promise<PublicRestaurant | null> => {
  const response = await fetch(
    `${apiInternalUrl()}/api/restaurants/public/${encodeURIComponent(slug)}`,
    { cache: 'no-store' },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Restaurant menu could not be loaded');
  return (await response.json()) as PublicRestaurant;
});

export async function generateMetadata({ params }: PageProps<'/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const [restaurant, locale] = await Promise.all([loadRestaurant(slug), getLocale()]);
  return publicMenuMetadata(restaurant, publicMenuCopy[locale].metadata);
}

export default async function PublicRestaurantPage({ params }: PageProps<'/[slug]'>) {
  const { slug } = await params;
  const [restaurant, locale] = await Promise.all([loadRestaurant(slug), getLocale()]);
  if (!restaurant) notFound();

  // Only this frame follows the language; what the owner wrote is shown as written.
  const copy = publicMenuCopy[locale];
  const whatsapp = whatsappHref(restaurant.whatsapp);
  const phone = telHref(restaurant.contactPhone);
  const socials = socialLinks(restaurant);
  const hasContact = Boolean(whatsapp ?? phone ?? restaurant.address) || socials.length > 0;

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
              {copy.eyebrow}
            </span>
            <span className="inline-flex min-h-7 shrink-0 items-center gap-2 rounded-full border border-current/15 px-2.5 py-1.5 text-[9px] font-extrabold tracking-[0.09em] uppercase opacity-80">
              <i
                aria-hidden="true"
                className="size-1.5 rounded-full bg-current shadow-[0_0_0_3px_color-mix(in_srgb,currentColor_15%,transparent)]"
              />
              {restaurant.categories.length ? copy.published : copy.comingSoon.status}
            </span>
          </div>

          <div className="mt-5 flex items-center gap-4 sm:gap-5">
            {restaurant.hasLogo ? (
              // Served by the public BFF route, which only resolves enabled restaurants.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={copy.logoAlt(restaurant.name)}
                className="size-16 shrink-0 rounded-2xl border border-current/15 object-cover sm:size-20"
                src={`/api/public/restaurants/${encodeURIComponent(restaurant.slug)}/logo`}
              />
            ) : null}
            <h1 className="m-0 max-w-[14ch] text-4xl leading-[0.98] font-semibold tracking-[-0.045em] wrap-anywhere sm:text-5xl lg:text-6xl">
              {restaurant.name}
            </h1>
          </div>

          {restaurant.address ? (
            <p className="mt-3 mb-0 text-[13px]/relaxed opacity-75">{restaurant.address}</p>
          ) : null}
          {restaurant.categories.length > 0 ? (
            <p className="mt-2 mb-0 max-w-[48ch] text-[13px]/relaxed opacity-75 text-pretty">
              {copy.intro}
            </p>
          ) : null}
        </header>

        {restaurant.categories.length === 0 ? (
          <div className="pt-8 pb-2">
            <span aria-hidden="true" className="text-2xl">
              ✦
            </span>
            <h2 className="my-1.5 font-semibold tracking-[-0.025em]">{copy.comingSoon.title}</h2>
            <p className="m-0 text-sm/normal opacity-75">{copy.comingSoon.body}</p>
          </div>
        ) : (
          <>
            {restaurant.categories.length > 1 ? (
              <nav
                aria-label={copy.sections.label}
                className="sticky top-0 z-10 -mx-6 mt-5 grid gap-1.5 border-y border-current/12 bg-[color-mix(in_srgb,var(--menu-background)_90%,white)] px-4 py-2 backdrop-blur-md sm:top-4 sm:mx-0 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-3 sm:rounded-xl sm:border"
              >
                <span className="shrink-0 px-1 text-[9px] font-black tracking-[0.12em] uppercase opacity-60">
                  {copy.sections.title}
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

                  {category.layout === 'CARDS' ? (
                    <div className="grid gap-4 pt-5 sm:grid-cols-2 sm:gap-5">
                      {category.products.map((product) => (
                        <ProductCard
                          copy={copy}
                          key={product.id}
                          locale={locale}
                          product={product}
                          slug={restaurant.slug}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid">
                      {category.products.map((product) => (
                        <ProductRow
                          copy={copy}
                          key={product.id}
                          locale={locale}
                          product={product}
                          slug={restaurant.slug}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </>
        )}

        {hasContact ? (
          <section
            aria-labelledby="contacto-titulo"
            className="mt-11 grid gap-3 border-t border-current/20 pt-8"
          >
            <h2
              className="m-0 text-[11px] font-extrabold tracking-[0.14em] uppercase opacity-60"
              id="contacto-titulo"
            >
              {copy.contact}
            </h2>
            <div className="grid gap-2 text-[13px]/relaxed">
              {restaurant.address ? <p className="m-0 opacity-80">{restaurant.address}</p> : null}
              {phone ? (
                <a className="inline-flex min-h-11 w-fit items-center font-bold no-underline" href={phone}>
                  {restaurant.contactPhone}
                </a>
              ) : null}
              {whatsapp ? (
                <a
                  className="inline-flex min-h-11 w-fit items-center gap-2 font-bold no-underline"
                  href={whatsapp}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span aria-hidden="true">✆</span> {copy.whatsapp.link}
                </a>
              ) : null}
            </div>
            {socials.length > 0 ? (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {socials.map((social) => (
                  <li key={social.href}>
                    <a
                      className="inline-flex min-h-11 items-center rounded-full border border-current/20 px-3.5 text-[12px] font-bold no-underline transition-colors hover:bg-current/10"
                      href={social.href}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        <footer className="flex items-center justify-center gap-2 pt-11 text-[9px] font-bold tracking-[0.08em] uppercase opacity-50">
          <span
            aria-hidden="true"
            className="grid size-5.5 place-items-center rounded-md bg-[var(--menu-foreground)] text-xs text-[var(--menu-background)]"
          >
            S
          </span>
          {copy.footer}
        </footer>
      </section>

      {whatsapp ? (
        <a
          aria-label={copy.whatsapp.floating}
          className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 inline-flex min-h-13 items-center gap-2 rounded-full bg-[#25d366] px-4 text-[13px] font-extrabold text-[#06331a] no-underline shadow-[0_0.5rem_1.5rem_rgb(0_0_0/0.25)] transition-transform active:scale-95 sm:right-8 sm:bottom-8"
          href={whatsapp}
          rel="noreferrer"
          target="_blank"
        >
          <span aria-hidden="true" className="text-base">
            ✆
          </span>
          WhatsApp
        </a>
      ) : null}
    </main>
  );
}

type PublicProduct = PublicRestaurant['categories'][number]['products'][number];

interface ProductProps {
  copy: PublicMenuCopy;
  locale: Locale;
  product: PublicProduct;
  slug: string;
}

/** Dense row: the default, and the only shape that reads well without photos. */
function ProductRow({ copy, locale, product, slug }: ProductProps) {
  return (
    <article
      data-testid="product-row"
      className={`border-b border-current/12 py-5 sm:py-6 ${
        product.hasImage
          ? 'grid grid-cols-[5.25rem_minmax(0,1fr)] items-start gap-3.5 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-5'
          : ''
      }`}
    >
      {product.hasImage ? (
        // Product images are served from the same public origin and sized by CSS.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={product.name}
          className="block aspect-square w-full rounded-2xl border border-current/15 object-cover"
          src={`/api/public/restaurants/${encodeURIComponent(slug)}/products/${product.id}/image`}
        />
      ) : null}
      <div className="min-w-0">
        <ProductHeading locale={locale} product={product} />
        <ProductDetails copy={copy} locale={locale} product={product} />
      </div>
    </article>
  );
}

/**
 * Photo-first card, chosen per section by the owner. A product without an image
 * simply renders a shorter, text-only card: no placeholder art, no broken frame.
 */
function ProductCard({ copy, locale, product, slug }: ProductProps) {
  return (
    <article
      className="grid content-start overflow-hidden rounded-2xl border border-current/15"
      data-testid="product-card"
    >
      {product.hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={product.name}
          className="block aspect-4/3 w-full object-cover"
          src={`/api/public/restaurants/${encodeURIComponent(slug)}/products/${product.id}/image`}
        />
      ) : null}
      <div className="min-w-0 p-4">
        <ProductHeading locale={locale} product={product} />
        <ProductDetails copy={copy} locale={locale} product={product} />
      </div>
    </article>
  );
}

function ProductHeading({ locale, product }: Omit<ProductProps, 'copy' | 'slug'>) {
  return (
    <div className="flex items-start justify-between gap-2.5 sm:items-baseline sm:gap-4">
      <h3 className="m-0 text-[17px] tracking-[-0.02em] sm:text-[19px]">{product.name}</h3>
      <strong className="shrink-0 rounded-md bg-current/8 px-1.5 py-1 text-xs whitespace-nowrap tabular-nums sm:text-[13px]">
        {formatCurrency(product.basePrice, locale)}
      </strong>
    </div>
  );
}

function ProductDetails({ copy, locale, product }: Omit<ProductProps, 'slug'>) {
  return (
    <>
      {product.description ? (
        <p className="mt-2 mb-0 max-w-[54ch] text-[13px]/normal opacity-75">
          {product.description}
        </p>
      ) : null}
      {product.variants.length > 0 ? (
        <OptionList items={product.variants} locale={locale} title={copy.options} />
      ) : null}
      {product.extras.length > 0 ? (
        <OptionList items={product.extras} locale={locale} title={copy.addOns} />
      ) : null}
    </>
  );
}

function OptionList({
  items,
  locale,
  title,
}: {
  items: Array<{ id?: string; name: string; price: string }>;
  locale: Locale;
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
            {item.name} <b className="ml-0.5 tabular-nums">{formatCurrency(item.price, locale)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

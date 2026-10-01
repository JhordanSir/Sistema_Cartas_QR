import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';

import { getPublicMenu } from '@/server/next/public-menu-cache';
import type { PublicMenu } from '@/server/public-menu';
import { formatPrice } from '@/shared/menu';
import {
  phoneLink,
  publicCategories,
  safeExternalUrl,
  whatsappLink,
  type SnapshotCategory,
  type SnapshotItem,
  type SnapshotProduct,
} from '@/shared/menu-snapshot';
import { DEFAULT_MENU_STYLE, type MenuStyle } from '@/shared/menu-style';
import { normalizePublicAppUrl } from '@/shared/qr';

type Props = PageProps<'/[slug]'>;

/**
 * No menu is built ahead of time: each one is rendered on its first visit and
 * then served from the cache (tag `menu:{slug}`) until it is invalidated (§E2).
 */
export function generateStaticParams(): { slug: string }[] {
  return [];
}
type Restaurant = Extract<PublicMenu, { kind: 'menu' }>['restaurant'];

async function loadMenu(props: Props): Promise<Extract<PublicMenu, { kind: 'menu' }>> {
  const { slug } = await props.params;
  const menu = await getPublicMenu(slug);
  if (menu.kind === 'missing') notFound();
  return menu;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const menu = await getPublicMenu(slug);
  if (menu.kind === 'missing') return { title: { absolute: 'Carta no disponible' } };

  const { address, logoUrl, name } = menu.restaurant;
  const title = `${name} · Carta digital`;
  const description = `Carta de ${name}${address ? ` en ${address}` : ''}. Platos, precios y disponibilidad al día.`;
  const base = normalizePublicAppUrl(process.env.PUBLIC_APP_URL);
  return {
    description,
    openGraph: {
      description,
      images: base && logoUrl ? [{ url: `${base}${logoUrl}` }] : undefined,
      locale: 'es_PE',
      title,
      type: 'website',
      ...(base ? { url: `${base}/${slug}` } : {}),
    },
    title: { absolute: title },
  };
}

/** The browser bar takes the menu's own background. */
export async function generateViewport(props: Props): Promise<Viewport> {
  const { slug } = await props.params;
  const menu = await getPublicMenu(slug);
  const background =
    menu.kind === 'menu' && menu.snapshot ? menu.snapshot.style.backgroundColor : DEFAULT_MENU_STYLE.backgroundColor;
  return { themeColor: background };
}

/** --menu-background, --menu-foreground and --menu-font (§E8): the panel never styles the menu. */
function menuVariables(style: MenuStyle): CSSProperties {
  return {
    '--menu-background': style.backgroundColor,
    '--menu-font': `"${style.fontFamily}", system-ui, sans-serif`,
    '--menu-foreground': style.textColor,
  } as CSSProperties;
}

const line = 'border-[color-mix(in_srgb,var(--menu-foreground)_18%,transparent)]';

export default async function PublicMenuPage(props: Props) {
  const { restaurant, snapshot } = await loadMenu(props);
  const style = snapshot?.style ?? DEFAULT_MENU_STYLE;
  const categories = snapshot ? publicCategories(snapshot) : [];

  return (
    <div
      className="min-h-dvh bg-(--menu-background) font-(family-name:--menu-font) text-(--menu-foreground)"
      style={menuVariables(style)}
    >
      <header className="mx-auto grid w-full max-w-3xl justify-items-center gap-3 px-4 pt-10 pb-6 text-center">
        {restaurant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- immutable /media URL
          <img
            alt={`Logo de ${restaurant.name}`}
            className="h-24 w-24 rounded-2xl object-contain"
            height={96}
            src={restaurant.logoUrl}
            width={96}
          />
        ) : null}
        <h1 className="m-0 text-3xl leading-tight font-bold sm:text-4xl">{restaurant.name}</h1>
        {restaurant.address ? <p className="m-0 text-[15px]">{restaurant.address}</p> : null}
      </header>

      {snapshot ? (
        <>
          {categories.length > 0 ? <SectionIndex categories={categories} /> : null}
          <main className="mx-auto grid w-full max-w-3xl gap-10 px-4 py-8">
            {categories.map((category) => (
              <MenuSection category={category} key={category.id} />
            ))}
          </main>
        </>
      ) : (
        <main className="mx-auto w-full max-w-3xl px-4 py-8">
          <p className={`m-0 rounded-2xl border px-5 py-6 text-center text-[17px] ${line}`}>
            Próximamente: este restaurante está preparando su carta digital.
          </p>
        </main>
      )}

      <Contact restaurant={restaurant} />

      <footer className="px-4 pt-4 pb-10 text-center text-sm">Carta digital creada con Sirio</footer>
    </div>
  );
}

/** Sticky chips that jump to each section; they scroll sideways on a phone. */
function SectionIndex({ categories }: { categories: SnapshotCategory[] }) {
  return (
    <nav
      aria-label="Secciones de la carta"
      className={`sticky top-0 z-10 border-y bg-(--menu-background) ${line}`}
    >
      <ul className="mx-auto m-0 flex w-full max-w-3xl list-none gap-2 overflow-x-auto px-4 py-2" role="list">
        {categories.map((category) => (
          <li className="shrink-0" key={category.id}>
            <a
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-[15px] font-semibold whitespace-nowrap text-(--menu-foreground) no-underline ${line}`}
              href={`#seccion-${category.id}`}
            >
              {category.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MenuSection({ category }: { category: SnapshotCategory }) {
  return (
    <section aria-labelledby={`titulo-${category.id}`} className="scroll-mt-20" id={`seccion-${category.id}`}>
      <h2 className="m-0 mb-4 text-2xl font-bold" id={`titulo-${category.id}`}>
        {category.name}
      </h2>
      {category.layout === 'CARDS' ? (
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {category.products.map((product) => (
            <li className={`overflow-hidden rounded-2xl border ${line}`} key={product.id}>
              {product.imageKey ? (
                // eslint-disable-next-line @next/next/no-img-element -- immutable /media URL
                <img
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                  height={300}
                  loading="lazy"
                  src={`/media/${product.imageKey}`}
                  width={400}
                />
              ) : null}
              <div className="grid gap-2 p-4">
                <ProductDetails product={product} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="m-0 grid list-none p-0" role="list">
          {category.products.map((product) => (
            <li className={`flex gap-4 border-b py-4 last:border-b-0 ${line}`} key={product.id}>
              <div className="grid min-w-0 flex-1 gap-2">
                <ProductDetails product={product} />
              </div>
              {product.imageKey ? (
                // eslint-disable-next-line @next/next/no-img-element -- immutable /media URL
                <img
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                  height={80}
                  loading="lazy"
                  src={`/media/${product.imageKey}`}
                  width={80}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProductDetails({ product }: { product: SnapshotProduct }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="m-0 text-lg leading-snug font-semibold">{product.name}</h3>
        <p className="m-0 shrink-0 font-semibold tabular-nums">{formatPrice(product.basePrice)}</p>
      </div>
      {product.description ? <p className="m-0 text-[15px] leading-relaxed">{product.description}</p> : null}
      <PricedList items={product.variants} title="Opciones" />
      <PricedList items={product.extras} title="Adicionales" />
    </>
  );
}

function PricedList({ items, title }: { items: SnapshotItem[]; title: string }) {
  if (items.length === 0) return null;
  return (
    <div className="grid gap-1">
      <p className="m-0 text-sm font-semibold">{title}</p>
      <ul className="m-0 grid list-none gap-0.5 p-0 text-[15px]" role="list">
        {items.map((item) => (
          <li className="flex justify-between gap-4" key={item.id}>
            <span>{item.name}</span>
            <span className="shrink-0 tabular-nums">{formatPrice(item.price)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Phone, WhatsApp and networks (§E8); a network is linked only if it is https://. */
function Contact({ restaurant }: { restaurant: Restaurant }) {
  const links: { href: string; label: string; external: boolean }[] = [];
  const phone = phoneLink(restaurant.contactPhone);
  if (phone) links.push({ external: false, href: phone, label: `Llamar al ${restaurant.contactPhone}` });
  const whatsapp = whatsappLink(restaurant.whatsapp);
  if (whatsapp) links.push({ external: true, href: whatsapp, label: 'Escribir por WhatsApp' });
  for (const [label, url] of [
    ['Instagram', restaurant.instagramUrl],
    ['Facebook', restaurant.facebookUrl],
    ['TikTok', restaurant.tiktokUrl],
  ] as const) {
    const safe = safeExternalUrl(url);
    if (safe) links.push({ external: true, href: safe, label });
  }
  if (links.length === 0) return null;

  return (
    <section aria-labelledby="titulo-contacto" className="mx-auto w-full max-w-3xl px-4 py-8">
      <h2 className="m-0 mb-4 text-2xl font-bold" id="titulo-contacto">
        Contacto
      </h2>
      <ul className="m-0 flex list-none flex-wrap gap-3 p-0" role="list">
        {links.map((link) => (
          <li key={link.href}>
            <ContactLink external={link.external} href={link.href}>
              {link.label}
            </ContactLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ContactLink({ children, external, href }: { children: ReactNode; external: boolean; href: string }) {
  return (
    <a
      className={`inline-flex min-h-11 items-center rounded-full border px-4 text-[15px] font-semibold text-(--menu-foreground) no-underline ${line}`}
      href={href}
      {...(external ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
    >
      {children}
    </a>
  );
}

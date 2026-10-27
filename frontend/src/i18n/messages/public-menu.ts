import type { Locale } from '../locale';

/**
 * The fixed frame of the public menu. Everything the owner wrote (restaurant, sections,
 * dishes, descriptions, address) is content and only ever arrives as a parameter.
 */
export interface PublicMenuCopy {
  addOns: string;
  comingSoon: { body: string; status: string; title: string };
  contact: string;
  eyebrow: string;
  footer: string;
  intro: string;
  logoAlt: (restaurant: string) => string;
  metadata: {
    description: (restaurant: string) => string;
    descriptionWithAddress: (restaurant: string, address: string) => string;
    /** Open Graph locale, in its own underscore format. */
    openGraphLocale: string;
    title: (restaurant: string) => string;
    unavailableTitle: string;
  };
  options: string;
  published: string;
  sections: { label: string; title: string };
  whatsapp: { floating: string; link: string };
}

export const publicMenuCopy: Record<Locale, PublicMenuCopy> = {
  en: {
    addOns: 'Add-ons',
    comingSoon: {
      body: "Very soon you'll find all of the restaurant's dishes here.",
      status: 'Coming soon',
      title: "We're getting the menu ready",
    },
    contact: 'Contact',
    eyebrow: 'Digital menu',
    footer: 'Digital menu published with Sirio',
    intro: 'Pick a section and find your next favorite.',
    logoAlt: (restaurant) => `${restaurant} logo`,
    metadata: {
      description: (restaurant) => `${restaurant}'s menu. Dishes, prices and availability, always up to date.`,
      descriptionWithAddress: (restaurant, address) =>
        `${restaurant}'s menu at ${address}. Dishes, prices and availability, always up to date.`,
      openGraphLocale: 'en_US',
      title: (restaurant) => `${restaurant} · Digital menu`,
      unavailableTitle: 'Menu unavailable | Sirio Automatiza',
    },
    options: 'Options',
    published: 'Menu published',
    sections: { label: 'Menu sections', title: 'Sections' },
    whatsapp: { floating: 'Message the restaurant on WhatsApp', link: 'Message on WhatsApp' },
  },
  es: {
    addOns: 'Adicionales',
    comingSoon: {
      body: 'Muy pronto encontrarás aquí todos los productos del restaurante.',
      status: 'Próximamente',
      title: 'Estamos preparando la carta',
    },
    contact: 'Contacto',
    eyebrow: 'Carta digital',
    footer: 'Carta digital publicada con Sirio',
    intro: 'Elige una sección y encuentra tu próximo favorito.',
    logoAlt: (restaurant) => `Logo de ${restaurant}`,
    metadata: {
      description: (restaurant) => `Carta de ${restaurant}. Platos, precios y disponibilidad al día.`,
      descriptionWithAddress: (restaurant, address) =>
        `Carta de ${restaurant} en ${address}. Platos, precios y disponibilidad al día.`,
      openGraphLocale: 'es_PE',
      title: (restaurant) => `${restaurant} · Carta digital`,
      unavailableTitle: 'Carta no disponible | Sirio Automatiza',
    },
    options: 'Presentaciones',
    published: 'Carta publicada',
    sections: { label: 'Secciones de la carta', title: 'Secciones' },
    whatsapp: { floating: 'Escribir al restaurante por WhatsApp', link: 'Escribir por WhatsApp' },
  },
};

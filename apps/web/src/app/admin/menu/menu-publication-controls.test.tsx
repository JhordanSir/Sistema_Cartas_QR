import { render, screen } from '@testing-library/react';

import type { Locale } from '@/i18n/locale';
import { LocaleProvider } from '@/i18n/locale-provider';
import type { PublishedMenu, RestaurantProfile } from '@/lib/restaurant-types';

import { MenuPublicationControls } from './menu-publication-controls';

const restaurant = {
  address: null,
  contactPhone: null,
  facebookUrl: null,
  id: 'restaurant-1',
  instagramUrl: null,
  logoPath: null,
  name: 'Cevichería Luna',
  slug: 'cevicheria-luna',
  status: 'ENABLED',
  tiktokUrl: null,
  updatedAt: '2026-09-05T12:00:00.000Z',
  whatsapp: null,
} as RestaurantProfile;

const menu: PublishedMenu = {
  categories: [
    {
      id: 'category-1',
      layout: 'LIST',
      name: 'Entradas',
      products: [
        {
          basePrice: '26.00',
          description: 'Pulpo al olivo.',
          extras: [],
          id: 'product-1',
          isAvailable: true,
          name: 'Causa de pulpo',
          variants: [],
        },
      ],
    },
  ],
  publication: {
    hasPublishedMenu: true,
    hasUnpublishedChanges: true,
    publishedAt: '2026-09-01T12:00:00.000Z',
  },
  restaurantId: 'restaurant-1',
  style: { backgroundColor: '#ffffff', fontFamily: 'Inter', textColor: '#111827' },
  template: 'TRADITIONAL',
  updatedAt: '2026-09-05T12:00:00.000Z',
};

function renderControls(locale: Locale) {
  render(
    <LocaleProvider locale={locale}>
      <MenuPublicationControls
        menu={menu}
        onPublish={jest.fn()}
        onTemplate={jest.fn()}
        publishing={false}
        restaurant={restaurant}
        templateSaving={false}
      />
    </LocaleProvider>,
  );
}

describe('MenuPublicationControls', () => {
  it('en español nombra las plantillas y el estado del borrador', () => {
    renderControls('es');

    expect(screen.getByRole('heading', { name: 'Tienes cambios por publicar' })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Tradicional' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Publicar cambios' })).toBeEnabled();
  });

  it('en inglés traduce plantillas, estado y precios de la previsualización', () => {
    renderControls('en');

    expect(screen.getByRole('heading', { name: 'You have changes to publish' })).toBeVisible();
    expect(screen.getByText('Draft')).toBeVisible();
    for (const label of ['Original', 'Casual', 'Premium']) {
      expect(screen.getByRole('radio', { name: label })).toHaveAttribute('aria-checked', 'false');
    }
    expect(screen.getByRole('radio', { name: 'Traditional' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Preview draft' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Publish changes' })).toBeEnabled();
    // The preview dialog is closed but already rendered: its prices follow the language.
    expect(screen.getByText(/^PEN\s26\.00$/)).toBeInTheDocument();
    expect(screen.getByText('Causa de pulpo')).toBeInTheDocument();
  });
});

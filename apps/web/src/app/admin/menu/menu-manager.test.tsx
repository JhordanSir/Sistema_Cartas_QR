import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { PublishedMenu, RestaurantProfile } from '@/lib/restaurant-types';

import { MenuManager } from './menu-manager';

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
    {
      id: 'category-2',
      layout: 'CARDS',
      name: 'Fondos',
      products: [],
    },
  ],
  publication: {
    hasPublishedMenu: true,
    hasUnpublishedChanges: false,
    publishedAt: '2026-09-01T12:00:00.000Z',
  },
  restaurantId: 'restaurant-1',
  style: { backgroundColor: '#ffffff', fontFamily: 'Inter', textColor: '#111827' },
  template: 'ORIGINAL',
  updatedAt: '2026-09-05T12:00:00.000Z',
};

function renderManager() {
  const setMenu = jest.fn();
  const setError = jest.fn();
  const setNotice = jest.fn();
  render(
    <MenuManager
      menu={menu}
      restaurant={restaurant}
      setError={setError}
      setMenu={setMenu}
      setNotice={setNotice}
    />,
  );
  return { setError, setMenu, setNotice };
}

describe('MenuManager · estilo de sección', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve(menu),
      ok: true,
    });
  });

  it('ofrece los dos estilos y preselecciona el de la sección editada', () => {
    renderManager();

    fireEvent.click(screen.getByRole('button', { name: 'Editar sección Fondos' }));

    const list = screen.getByRole('radio', { name: /Lista compacta/ });
    const cards = screen.getByRole('radio', { name: /Tarjetas con foto/ });
    expect(list).not.toBeChecked();
    expect(cards).toBeChecked();
  });

  it('una sección nueva arranca como lista compacta', () => {
    renderManager();

    fireEvent.click(screen.getByRole('button', { name: '+ Nueva sección' }));

    expect(screen.getByRole('radio', { name: /Lista compacta/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Tarjetas con foto/ })).not.toBeChecked();
  });

  it('envía el estilo elegido junto al nombre', async () => {
    renderManager();

    fireEvent.click(screen.getByRole('button', { name: 'Editar sección Entradas' }));
    fireEvent.click(screen.getByRole('radio', { name: /Tarjetas con foto/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar sección' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/owner/restaurants/restaurant-1/menu/categories/category-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({ layout: 'CARDS', name: 'Entradas' });
  });

  it('renombrar sin tocar el estilo conserva el que ya tenía', async () => {
    renderManager();

    fireEvent.click(screen.getByRole('button', { name: 'Editar sección Fondos' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Platos de fondo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar sección' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      layout: 'CARDS',
      name: 'Platos de fondo',
    });
  });
});

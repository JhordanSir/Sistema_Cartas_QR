import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MenuDigitizer } from './menu-digitizer';

const replace = jest.fn();
const refresh = jest.fn();
const router = { replace, refresh };

jest.mock('next/navigation', () => ({
  useRouter: () => router,
}));

const profile = {
  address: null,
  contactPhone: null,
  facebookUrl: null,
  id: '33333333-3333-4333-8333-333333333333',
  instagramUrl: null,
  logoPath: null,
  name: 'Mesa Norte',
  slug: 'mesa-norte',
  status: 'ENABLED',
  tiktokUrl: null,
  updatedAt: '2026-08-26T18:00:00.000Z',
  whatsapp: null,
};

const emptyMenu = {
  categories: [],
  restaurantId: profile.id,
  style: { backgroundColor: '#ffffff', fontFamily: 'Inter', textColor: '#111827' },
  updatedAt: '2026-08-26T18:00:00.000Z',
};

const publishedMenu = {
  ...emptyMenu,
  categories: [
    {
      id: 'category-1',
      name: 'Fondos',
      products: [
        {
          basePrice: '28.00',
          description: 'Con papas y arroz',
          extras: [],
          id: 'product-1',
          imagePath: null,
          isAvailable: true,
          name: 'Lomo Salatado',
          variants: [],
        },
      ],
    },
  ],
};

describe('MenuDigitizer', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn().mockReturnValue('blob:menu-photo'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: jest.fn(),
    });
    global.fetch = jest.fn(async (input, init) => {
      const url = String(input);
      if (url === '/api/owner/restaurants') return apiResponse([profile]);
      if (init?.method === 'POST') return apiResponse(publishedMenu);
      if (init?.method === 'PATCH') {
        return apiResponse({
          ...publishedMenu,
          categories: [
            {
              ...publishedMenu.categories[0]!,
              products: [{ ...publishedMenu.categories[0]!.products[0]!, name: 'Lomo Saltado' }],
            },
          ],
        });
      }
      return apiResponse(emptyMenu);
    }) as jest.Mock;
  });

  it('publishes selected menu photos and allows a product correction', async () => {
    render(<MenuDigitizer />);

    expect(await screen.findByRole('heading', { name: 'Tu carta, lista en minutos' })).toBeVisible();
    const photoInput = await screen.findByLabelText('Fotos de la carta');
    const photo = new File([new Uint8Array([137, 80, 78, 71])], 'carta.png', {
      type: 'image/png',
    });
    fireEvent.change(photoInput, {
      target: { files: [photo] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Digitalizar y publicar' }));

    expect(await screen.findByText('Lomo Salatado')).toBeVisible();
    expect(screen.getByText('Carta digitalizada y publicada. Revisa los datos y corrige lo que necesites.')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Editar Lomo Salatado' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Lomo Saltado' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Editar Lomo Salatado' }));

    await waitFor(() => expect(screen.getByText('Lomo Saltado')).toBeVisible());
    expect(screen.getByText('Producto actualizado en la carta pública.')).toBeVisible();
  });

  it('creates the first section from an empty menu', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/owner/restaurants') return apiResponse([profile]);
      if (url.endsWith('/menu/categories') && init?.method === 'POST') {
        return apiResponse({
          ...emptyMenu,
          categories: [{ id: 'category-1', name: 'Entradas', products: [] }],
        });
      }
      return apiResponse(emptyMenu);
    });
    render(<MenuDigitizer />);

    await screen.findByText('Crea la primera sección para empezar tu carta.');
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva sección' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Entradas' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Nueva sección' }));

    expect(await screen.findByRole('heading', { name: 'Entradas' })).toBeVisible();
    expect(screen.getByText('Sección creada y publicada.')).toBeVisible();
  });

  it('rejects more than five files before calling the API', async () => {
    render(<MenuDigitizer />);
    const photoInput = await screen.findByLabelText('Fotos de la carta');
    const files = Array.from({ length: 6 }, (_, index) =>
      new File([new Uint8Array([137, 80, 78, 71])], `carta-${index}.png`, {
        type: 'image/png',
      }),
    );
    fireEvent.change(photoInput, { target: { files } });
    expect(screen.getByRole('alert')).toHaveTextContent('Elige entre 1 y 5 fotos');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

function apiResponse(body: unknown): Response {
  return {
    json: jest.fn().mockResolvedValue(body),
    ok: true,
    status: 200,
  } as unknown as Response;
}

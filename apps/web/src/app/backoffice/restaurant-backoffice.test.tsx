import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { RestaurantBackoffice } from './restaurant-backoffice';

const replace = jest.fn();
const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}));

describe('RestaurantBackoffice', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        items: [],
        page: 1,
        pageSize: 100,
        total: 0,
      }),
      ok: true,
      status: 200,
    } as unknown as Response);
  });

  it('muestra el estado vacío y abre el formulario de alta accesible', async () => {
    render(<RestaurantBackoffice />);

    expect(
      await screen.findByRole('heading', { name: 'Restaurantes', level: 1 }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('No hay restaurantes en esta vista')).toBeVisible(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo restaurante' }));
    expect(
      screen.getByRole('heading', { name: 'Abre la ficha del restaurante' }),
    ).toBeVisible();
    expect(screen.getByLabelText('Nombre del restaurante')).toBeRequired();
    expect(screen.getByLabelText('Correo del dueño')).toHaveAttribute(
      'type',
      'email',
    );
    expect(screen.getByLabelText(/Contraseña inicial/)).toHaveAttribute(
      'minlength',
      '8',
    );
  });

  it('muestra los estados y folios de los locales visibles en el registro', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        items: [
          restaurant('Casa Oliva', 'ENABLED'),
          restaurant('Mesa Naranja', 'DISABLED'),
        ],
        page: 1,
        pageSize: 100,
        total: 2,
      }),
      ok: true,
      status: 200,
    } as unknown as Response);

    render(<RestaurantBackoffice />);

    expect(await screen.findByText('1 en servicio')).toBeVisible();
    expect(screen.getByText('1 pausados')).toBeVisible();
    expect(screen.getByText('Folio 001')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Abrir carta /casa-oliva' })).toHaveAttribute('href', '/casa-oliva');
  });
});

function restaurant(name: string, status: 'ENABLED' | 'DISABLED') {
  return {
    createdAt: '2026-09-01T10:00:00.000Z',
    id: status === 'ENABLED' ? '11111111-1111-4111-8111-111111111111' : '22222222-2222-4222-8222-222222222222',
    name,
    owner: {
      email: `${name.toLowerCase().replace(' ', '.')}@example.test`,
      id: status === 'ENABLED' ? '33333333-3333-4333-8333-333333333333' : '44444444-4444-4444-8444-444444444444',
      isActive: true,
    },
    slug: name === 'Casa Oliva' ? 'casa-oliva' : 'mesa-naranja',
    status,
    updatedAt: '2026-09-01T10:00:00.000Z',
  };
}

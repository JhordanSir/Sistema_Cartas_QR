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
});

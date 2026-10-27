import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { LocaleProvider } from '@/i18n/locale-provider';

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
    // La pista describe la misma regla que exige la API desde la fase 1.
    expect(
      screen.getByText('Mínimo 8 caracteres, con mayúscula, minúscula y número.'),
    ).toBeVisible();
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

    // La fila plegada identifica el local: nombre, estado y propietario.
    expect(screen.getByText('Casa Oliva')).toBeVisible();
    expect(screen.getByText('Habilitado')).toBeVisible();
    expect(screen.getByText('Deshabilitado')).toBeVisible();
    expect(screen.getByText('casa.oliva@example.test')).toBeVisible();
  });

  it('guarda el detalle y las acciones detrás del despliegue de cada fila', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        items: [restaurant('Casa Oliva', 'ENABLED')],
        page: 1,
        pageSize: 20,
        total: 1,
      }),
      ok: true,
      status: 200,
    } as unknown as Response);

    const { container } = render(<RestaurantBackoffice />);
    await screen.findByText('Casa Oliva');

    const row = container.querySelector('details[data-testid="restaurant-row"]');
    expect(row).not.toBeNull();
    expect(row).not.toHaveAttribute('open');

    // El contenido existe en el documento aunque el navegador aún no lo muestre.
    expect(screen.getByRole('link', { name: /Abrir carta/ })).toHaveAttribute(
      'href',
      '/casa-oliva',
    );
    expect(screen.getByRole('link', { name: /Ver estadísticas/ })).toHaveAttribute(
      'href',
      '/backoffice/statistics?restaurante=11111111-1111-4111-8111-111111111111',
    );
    expect(screen.getByRole('button', { name: 'Deshabilitar' })).toBeInTheDocument();
    expect(screen.getByText('Folio')).toBeInTheDocument();
    expect(screen.getByText('001')).toBeInTheDocument();
  });

  it('aparta el borrado definitivo de la acción de todos los días', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        items: [restaurant('Casa Oliva', 'ENABLED')],
        page: 1,
        pageSize: 20,
        total: 1,
      }),
      ok: true,
      status: 200,
    } as unknown as Response);

    render(<RestaurantBackoffice />);
    await screen.findByText('Casa Oliva');

    // Eliminar no comparte fila con Deshabilitar: vive tras su propio menú.
    expect(screen.getByRole('button', { name: 'Acciones de Casa Oliva' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Casa Oliva' }));

    expect(
      await screen.findByRole('heading', { name: 'Eliminar Casa Oliva' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar definitivamente' })).toBeDisabled();
  });

  it('en inglés traduce el registro y pide la frase DELETE, no la del otro idioma', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        items: [restaurant('Casa Oliva', 'ENABLED')],
        page: 1,
        pageSize: 20,
        total: 1,
      }),
      ok: true,
      status: 200,
    } as unknown as Response);

    const { container } = render(
      <LocaleProvider locale="en">
        <RestaurantBackoffice />
      </LocaleProvider>,
    );
    await screen.findByText('Casa Oliva');

    expect(screen.getByRole('heading', { name: 'Restaurants', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('1 restaurant in this search')).toBeVisible();
    expect(screen.getByText('1 in service')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Restaurants' })).toHaveAttribute('aria-current', 'page');

    const row = container.querySelector<HTMLElement>('details[data-testid="restaurant-row"]');
    if (!row) throw new Error('Restaurant row was not rendered');
    expect(within(row).getByText('Enabled')).toBeInTheDocument();
    expect(within(row).getByText('Sep 1, 2026')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: /View statistics/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Casa Oliva' }));
    expect(await screen.findByRole('heading', { name: 'Delete Casa Oliva' })).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Delete permanently' });
    const phrase = screen.getByLabelText(/Type DELETE casa-oliva/);

    fireEvent.click(screen.getByLabelText('I understand this deletion cannot be undone.'));
    fireEvent.change(phrase, { target: { value: 'ELIMINAR casa-oliva' } });
    expect(submit).toBeDisabled();
    fireEvent.change(phrase, { target: { value: 'DELETE casa-oliva' } });
    expect(submit).toBeEnabled();
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

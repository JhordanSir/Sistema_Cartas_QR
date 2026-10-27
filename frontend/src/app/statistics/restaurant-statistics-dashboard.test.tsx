import { act, render, screen, waitFor } from '@testing-library/react';

import { LocaleProvider } from '@/i18n/locale-provider';

import { RestaurantStatisticsDashboard } from './restaurant-statistics-dashboard';

const replace = jest.fn();
const refresh = jest.fn();
// Stable like the real router, so a re-render alone never looks like a new dependency.
const router = { refresh, replace };

let searchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
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
  updatedAt: '2026-09-01T10:00:00.000Z',
  whatsapp: null,
};

const statistics = {
  generatedForDate: '2026-09-01',
  hourly: Array.from({ length: 24 }, (_, hour) => ({
    averageViews: hour === 13 ? 2 : 0,
    hour,
    totalViews: hour === 13 ? 6 : 0,
  })),
  timeZone: 'America/Lima',
  uniqueViews: { allTime: 9, last30Days: 9, last7Days: 7 },
  weekdays: Array.from({ length: 7 }, (_, dayOfWeek) => ({
    averageViews: dayOfWeek === 1 ? 3.5 : 0,
    dayOfWeek,
    totalViews: dayOfWeek === 1 ? 7 : 0,
  })),
};

describe('RestaurantStatisticsDashboard', () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    global.fetch = jest.fn().mockImplementation((url: string) => Promise.resolve(
      url === '/api/owner/restaurants'
        ? apiResponse([profile])
        : apiResponse(statistics),
    ));
  });

  it('abre el local que pide el backoffice desde su fila del registro', async () => {
    const second = { ...profile, id: '55555555-5555-4555-8555-555555555555', name: 'Mesa Sur', slug: 'mesa-sur' };
    searchParams = new URLSearchParams({ restaurante: second.id });
    global.fetch = jest.fn().mockImplementation((url: string) => Promise.resolve(
      url.startsWith('/api/backoffice/restaurants?')
        ? apiResponse({ items: [profile, second], page: 1, pageSize: 100, total: 2 })
        : apiResponse(statistics),
    ));

    render(<RestaurantStatisticsDashboard scope="backoffice" />);

    // Sin el parámetro se habría abierto el primero de la lista.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Mesa Sur', level: 2 })).toBeVisible(),
    );
  });

  it('ignora un identificador que no está en la lista y abre el primero', async () => {
    searchParams = new URLSearchParams({ restaurante: 'no-existe' });
    global.fetch = jest.fn().mockImplementation((url: string) => Promise.resolve(
      url.startsWith('/api/backoffice/restaurants?')
        ? apiResponse({ items: [profile], page: 1, pageSize: 100, total: 1 })
        : apiResponse(statistics),
    ));

    render(<RestaurantStatisticsDashboard scope="backoffice" />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Mesa Norte', level: 2 })).toBeVisible(),
    );
  });

  it('shows the selected restaurant, unique-view periods and service rhythms', async () => {
    render(<RestaurantStatisticsDashboard scope="owner" />);

    expect(await screen.findByRole('heading', { name: 'Estadísticas', level: 1 })).toBeVisible();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Mesa Norte', level: 2 })).toBeVisible());
    expect(screen.getByText('7')).toBeVisible();
    expect(screen.getAllByText('9')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Ritmo por hora', level: 2 })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Ritmo por día', level: 2 })).toBeVisible();
    expect(screen.getByText('Hora de Perú · UTC−5')).toBeVisible();
    // El día pico se nombra completo; la abreviatura queda para el eje.
    expect(screen.getByText('El mayor movimiento llega los lunes a las 13:00.')).toBeVisible();
    expect(screen.getByText('Lun')).toBeVisible();
  });

  it('en inglés traduce el informe y conserva el reloj de 24 horas', async () => {
    render(
      <LocaleProvider locale="en">
        <RestaurantStatisticsDashboard scope="owner" />
      </LocaleProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Statistics', level: 1 })).toBeVisible();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Mesa Norte', level: 2 })).toBeVisible());
    expect(screen.getByText('Your menu at a glance')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Hourly rhythm', level: 2 })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Daily rhythm', level: 2 })).toBeVisible();
    expect(screen.getByText('Peru time · UTC−5')).toBeVisible();
    expect(screen.getByText('Activity peaks on Mondays at 13:00.')).toBeVisible();
    expect(screen.getByText('Mon')).toBeVisible();
    expect(screen.getByText('Last 30 days')).toBeVisible();
    // The restaurant is the owner's content: it never changes with the language.
    expect(screen.getByText('/mesa-norte')).toBeVisible();
  });

  it('cambiar de idioma traduce el informe sin volver a pedir los datos', async () => {
    const { rerender } = render(
      <LocaleProvider locale="es">
        <RestaurantStatisticsDashboard scope="owner" />
      </LocaleProvider>,
    );
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Mesa Norte', level: 2 })).toBeVisible());
    const requests = (global.fetch as jest.Mock).mock.calls.length;

    rerender(
      <LocaleProvider locale="en">
        <RestaurantStatisticsDashboard scope="owner" />
      </LocaleProvider>,
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

    expect(screen.getByRole('heading', { name: 'Hourly rhythm', level: 2 })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Mesa Norte', level: 2 })).toBeVisible();
    expect(global.fetch).toHaveBeenCalledTimes(requests);
  });

  it('adapta la introducción para el administrador de la plataforma', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => Promise.resolve(
      url.startsWith('/api/backoffice/restaurants')
        ? apiResponse({
            items: [{
              ...profile,
              owner: { email: 'owner@example.test', id: '44444444-4444-4444-8444-444444444444', isActive: true },
            }],
            page: 1,
            pageSize: 100,
            total: 1,
          })
        : apiResponse(statistics),
    ));

    render(<RestaurantStatisticsDashboard scope="backoffice" />);

    expect(await screen.findByText('Panorama de la plataforma')).toBeVisible();
    expect(screen.getByText(/Consulta el movimiento de cada carta/)).toBeVisible();
  });
});

function apiResponse(body: unknown): Response {
  return {
    json: jest.fn().mockResolvedValue(body),
    ok: true,
    status: 200,
  } as unknown as Response;
}

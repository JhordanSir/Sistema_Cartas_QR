import { render, screen, waitFor } from '@testing-library/react';

import { RestaurantStatisticsDashboard } from './restaurant-statistics-dashboard';

const replace = jest.fn();
const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
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
    global.fetch = jest.fn().mockImplementation((url: string) => Promise.resolve(
      url === '/api/owner/restaurants'
        ? apiResponse([profile])
        : apiResponse(statistics),
    ));
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

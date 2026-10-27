import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LocaleProvider } from '@/i18n/locale-provider';

import { RestaurantProfilePanel } from './restaurant-profile-panel';

const replace = jest.fn();
const refresh = jest.fn();
// Stable like the real router, so a re-render alone never looks like a new dependency.
const router = { refresh, replace };

jest.mock('next/navigation', () => ({
  useRouter: () => router,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="" {...props} />
  ),
}));

describe('RestaurantProfilePanel', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([
        {
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
        },
      ]),
      ok: true,
      status: 200,
    } as unknown as Response);
  });

  it('renders the owner profile form with upload constraints and contact fields', async () => {
    render(<RestaurantProfilePanel />);

    expect(await screen.findByRole('heading', { name: 'Tu perfil' })).toBeVisible();
    await waitFor(() => expect(screen.getByText('Mesa Norte')).toBeVisible());
    expect(screen.getByLabelText('Logo del restaurante')).toHaveAttribute(
      'accept',
      'image/png,image/jpeg,image/webp',
    );
    expect(screen.getByLabelText('WhatsApp')).toHaveAttribute('maxlength', '32');
    expect(screen.getByLabelText('Instagram')).toHaveAttribute('type', 'url');
  });

  it('pide la ciudad y, mientras falte, el clima solo invita a completarla', async () => {
    render(<RestaurantProfilePanel />);

    expect(await screen.findByLabelText(/^Ciudad/)).toHaveAttribute('maxlength', '120');
    expect(screen.getByLabelText(/^Ciudad/)).toHaveAttribute('name', 'city');
    expect(screen.getByRole('region', { name: 'Clima ahora' })).toHaveTextContent(
      'Agrega la ciudad de tu local para ver el clima de tu zona.',
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects a logo larger than 2 MB before sending it', async () => {
    render(<RestaurantProfilePanel />);
    const input = await screen.findByLabelText('Logo del restaurante');
    const oversized = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'logo.png', {
      type: 'image/png',
    });
    fireEvent.change(input, { target: { files: [oversized] } });
    expect(
      screen.getByText('El logo debe ser PNG, JPG o WebP y pesar como máximo 2 MB.'),
    ).toBeVisible();
  });

  it('cambiar de idioma traduce el formulario sin recargarlo ni perder lo escrito', async () => {
    const { rerender } = render(
      <LocaleProvider locale="es">
        <RestaurantProfilePanel />
      </LocaleProvider>,
    );
    fireEvent.change(await screen.findByLabelText('Teléfono'), {
      target: { value: '(01) 555-0199' },
    });
    const requests = (global.fetch as jest.Mock).mock.calls.length;

    rerender(
      <LocaleProvider locale="en">
        <RestaurantProfilePanel />
      </LocaleProvider>,
    );
    // Lets a reload scheduled by the switch run, if there were one.
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

    expect(screen.getByRole('heading', { name: 'Your profile' })).toBeVisible();
    expect(screen.getByLabelText('Phone')).toHaveValue('(01) 555-0199');
    expect(global.fetch).toHaveBeenCalledTimes(requests);
  });

  it('solo vuelve a pedir el clima cuando se guarda otra ciudad', async () => {
    let saved = { ...PROFILE, city: 'Lima' };
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('https://geocoding-api.open-meteo.com/')) {
        return Promise.resolve(
          jsonResponse({ results: [{ admin1: 'Provincia de Lima', latitude: -12.04, longitude: -77.03 }] }),
        );
      }
      if (url.startsWith('https://api.open-meteo.com/')) {
        return Promise.resolve(
          jsonResponse({
            current: { is_day: 1, temperature_2m: 19, time: '2026-09-22T15:00', weather_code: 0 },
          }),
        );
      }
      if (init?.method === 'PATCH') {
        const city = (init.body as FormData).get('city');
        saved = { ...saved, city: String(city), updatedAt: new Date().toISOString() };
        return Promise.resolve(jsonResponse(saved));
      }
      return Promise.resolve(jsonResponse([saved]));
    }) as jest.Mock;
    const openMeteoCalls = () =>
      (global.fetch as jest.Mock).mock.calls.filter(([url]) => String(url).includes('open-meteo.com'))
        .length;

    render(<RestaurantProfilePanel />);
    expect(await screen.findByText('19 °C')).toBeVisible();
    expect(openMeteoCalls()).toBe(2);

    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '(01) 555-0199' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }));
    expect(await screen.findByText(/Perfil guardado/)).toBeVisible();
    expect(screen.getByText('19 °C')).toBeVisible();
    expect(openMeteoCalls()).toBe(2);

    fireEvent.change(screen.getByLabelText(/^Ciudad/), { target: { value: 'Cusco' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }));
    await waitFor(() => expect(openMeteoCalls()).toBe(4));
    expect(await screen.findByText('Cusco · Provincia de Lima')).toBeVisible();
  });
});

const PROFILE = {
  address: null,
  city: null,
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

function jsonResponse(body: unknown): Response {
  return { json: jest.fn().mockResolvedValue(body), ok: true, status: 200 } as unknown as Response;
}

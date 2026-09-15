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
});

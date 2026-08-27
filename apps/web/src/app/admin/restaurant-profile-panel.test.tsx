import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { RestaurantProfilePanel } from './restaurant-profile-panel';

const replace = jest.fn();
const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
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
});

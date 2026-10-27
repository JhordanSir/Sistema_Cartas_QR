import { fireEvent, render, screen } from '@testing-library/react';

import { QrManager } from './qr-manager';

const replace = jest.fn();
const refresh = jest.fn();
const router = { refresh, replace };

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
  updatedAt: '2026-08-27T18:00:00.000Z',
  whatsapp: null,
};

describe('QrManager', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation((url: string) => Promise.resolve(
      url.endsWith('/qr')
        ? apiResponse({ publicUrl: 'https://cartas.example.com/mesa-norte' })
        : apiResponse([profile]),
    ));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it('shows the permanent QR and both printable downloads', async () => {
    render(<QrManager />);

    expect(await screen.findByRole('heading', { name: 'Mesa Norte' })).toBeVisible();
    expect(screen.getByAltText('Código QR de Mesa Norte')).toHaveAttribute(
      'src',
      `/api/owner/restaurants/${profile.id}/qr/svg`,
    );
    expect(screen.getByRole('link', { name: 'Descargar PNG' })).toHaveAttribute(
      'href',
      `/api/owner/restaurants/${profile.id}/qr/png?download=true`,
    );
    expect(screen.getByRole('link', { name: 'Descargar SVG' })).toHaveAttribute(
      'href',
      `/api/owner/restaurants/${profile.id}/qr/svg?download=true`,
    );
    expect(await screen.findByRole('link', { name: 'Probar enlace público ↗' })).toHaveAttribute(
      'href',
      'https://cartas.example.com/mesa-norte',
    );
  });

  it('copies the same public URL encoded by the QR', async () => {
    render(<QrManager />);
    await screen.findByText('https://cartas.example.com/mesa-norte');

    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://cartas.example.com/mesa-norte',
    );
    expect(await screen.findByRole('button', { name: 'Copiado' })).toBeVisible();
  });
});

function apiResponse(body: unknown): Response {
  return {
    json: jest.fn().mockResolvedValue(body),
    ok: true,
    status: 200,
  } as unknown as Response;
}

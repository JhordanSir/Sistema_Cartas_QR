import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { OwnerNavigation } from './owner-navigation';

const replace = jest.fn();
const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ''} />
  ),
}));

describe('OwnerNavigation', () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  it('identifies the current section and keeps every task labeled', () => {
    render(<OwnerNavigation active="menu" />);

    expect(screen.getByRole('link', { name: 'Carta' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Perfil' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'QR' })).toHaveAttribute('href', '/admin/qr');
    expect(screen.getByRole('link', { name: 'Ayuda' })).toHaveAttribute('href', '/admin/help');
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  });

  it('ends the session before returning to owner access', async () => {
    render(<OwnerNavigation active="profile" />);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/session/logout', { method: 'POST' }));
    expect(replace).toHaveBeenCalledWith('/admin/login');
    expect(refresh).toHaveBeenCalled();
  });
});

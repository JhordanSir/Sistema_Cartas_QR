import { render, screen, waitFor } from '@testing-library/react';

import { SessionGate, SessionRedirect } from './session-access';

const replace = jest.fn();
const fetchMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

describe('SessionGate', () => {
  beforeEach(() => {
    replace.mockReset();
    fetchMock.mockReset();
    Object.defineProperty(global, 'fetch', { configurable: true, value: fetchMock });
  });

  it('mounts protected content only after validating the requested role', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    render(
      <SessionGate redirectTo="/admin/login" role="OWNER">
        <p>Contenido del propietario</p>
      </SessionGate>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Comprobando tu sesión');
    await waitFor(() => expect(screen.getByText('Contenido del propietario')).toBeVisible());
    expect(fetchMock).toHaveBeenCalledWith('/api/session/status?role=OWNER', {
      cache: 'no-store',
      method: 'POST',
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it('sends an expired or unauthorized session to the login without mounting protected content', async () => {
    fetchMock.mockResolvedValue({ ok: false });

    render(
      <SessionGate redirectTo="/admin/login" role="OWNER">
        <p>Contenido del propietario</p>
      </SessionGate>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/login'));
    expect(screen.queryByText('Contenido del propietario')).not.toBeInTheDocument();
  });
});

describe('SessionRedirect', () => {
  beforeEach(() => {
    replace.mockReset();
    fetchMock.mockReset();
    Object.defineProperty(global, 'fetch', { configurable: true, value: fetchMock });
  });

  it('does not redirect a stale owner session away from the login', async () => {
    fetchMock.mockResolvedValue({ ok: false });

    render(<SessionRedirect destination="/admin" role="OWNER" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(replace).not.toHaveBeenCalled();
  });
});

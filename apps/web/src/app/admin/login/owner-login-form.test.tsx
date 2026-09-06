import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { OwnerLoginForm } from './owner-login-form';

const replace = jest.fn();
const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, replace }),
}));

function fillCredentials() {
  fireEvent.change(screen.getByLabelText('Correo del propietario'), {
    target: { value: 'hola@turestaurante.pe' },
  });
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: 'OwnerPass-1' },
  });
}

describe('OwnerLoginForm', () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
  });

  it('pide el rol de propietario y lleva al panel', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    render(<OwnerLoginForm />);

    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: 'Entrar a mi restaurante' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      email: 'hola@turestaurante.pe',
      password: 'OwnerPass-1',
      role: 'OWNER',
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin'));
  });

  it('distingue credenciales erróneas de un fallo del servicio', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    const { unmount } = render(<OwnerLoginForm />);

    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: 'Entrar a mi restaurante' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El correo o la contraseña no son correctos.',
    );
    expect(replace).not.toHaveBeenCalled();
    unmount();

    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    render(<OwnerLoginForm />);
    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: 'Entrar a mi restaurante' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos iniciar sesión. Inténtalo nuevamente.',
    );
  });

  it('permite revisar la contraseña escrita y volver a ocultarla', () => {
    render(<OwnerLoginForm />);

    const password = screen.getByLabelText('Contraseña');
    const toggle = screen.getByRole('button', { name: 'Mostrar' });
    expect(password).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('evita envíos repetidos mientras la petición está en curso', async () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => undefined));
    render(<OwnerLoginForm />);

    fillCredentials();
    const submit = screen.getByRole('button', { name: 'Entrar a mi restaurante' });
    fireEvent.click(submit);

    await waitFor(() => expect(submit).toBeDisabled());
    expect(submit).toHaveTextContent('Ingresando…');
  });
});

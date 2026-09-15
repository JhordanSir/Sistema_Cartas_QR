import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LoginForm } from './login-form';

const replace = jest.fn();
const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, replace }),
}));

function fillCredentials(email = 'admin@sirio.pe', password = 'AdminPass-1') {
  fireEvent.change(screen.getByLabelText('Correo del administrador'), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Entrar al backoffice' }));
}

describe('LoginForm', () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
  });

  it('pide el rol de administrador y lleva al backoffice', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    render(<LoginForm />);

    fillCredentials();
    submit();

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/session/login');
    expect(JSON.parse(String(init.body))).toEqual({
      email: 'admin@sirio.pe',
      password: 'AdminPass-1',
      role: 'ADMIN',
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/backoffice'));
    expect(refresh).toHaveBeenCalled();
  });

  it('distingue credenciales erróneas de un fallo del servicio', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    const { unmount } = render(<LoginForm />);

    fillCredentials();
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El correo o la contraseña no son correctos.',
    );
    expect(replace).not.toHaveBeenCalled();
    unmount();

    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    render(<LoginForm />);
    fillCredentials();
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos iniciar sesión. Inténtalo nuevamente.',
    );
  });

  it.each(['admin', 'admin@sirio', '@sirio.pe', 'admin sirio@sirio.pe'])(
    'no envía el correo %p y explica cómo escribirlo',
    (email) => {
      global.fetch = jest.fn();
      render(<LoginForm />);

      fillCredentials(email);
      submit();

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Escribe un correo válido, por ejemplo nombre@dominio.com.',
      );
      expect(screen.getByLabelText('Correo del administrador')).toHaveAttribute(
        'aria-invalid',
        'true',
      );
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it('pide la contraseña cuando se envía vacía', () => {
    global.fetch = jest.fn();
    render(<LoginForm />);

    fillCredentials('admin@sirio.pe', '');
    submit();

    expect(screen.getByRole('alert')).toHaveTextContent('Escribe tu contraseña.');
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('aria-invalid', 'true');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('avisa al volver al correo si la contraseña no tiene mayúscula, minúscula y número', () => {
    render(<LoginForm />);
    const password = screen.getByLabelText('Contraseña');

    fireEvent.change(password, { target: { value: 'solominusculas' } });
    fireEvent.blur(password, { relatedTarget: screen.getByLabelText('Correo del administrador') });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Recomendamos mayúscula, minúscula y número.',
    );

    fireEvent.change(password, { target: { value: 'AdminPass-1' } });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('no añade el aviso de contraseña cuando el foco sale hacia un botón', () => {
    render(<LoginForm />);
    const password = screen.getByLabelText('Contraseña');

    fireEvent.change(password, { target: { value: 'solominusculas' } });
    fireEvent.blur(password, {
      relatedTarget: screen.getByRole('button', { name: 'Entrar al backoffice' }),
    });
    fireEvent.blur(password, { relatedTarget: null });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('recomienda una contraseña más fuerte sin impedir entrar al insistir', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    render(<LoginForm />);

    fillCredentials('admin@sirio.pe', 'clave-heredada');
    submit();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();

    submit();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/backoffice'));
  });

  it('evita envíos repetidos mientras la petición está en curso', async () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => undefined));
    render(<LoginForm />);

    fillCredentials();
    const button = screen.getByRole('button', { name: 'Entrar al backoffice' });
    fireEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());
    expect(button).toHaveTextContent('Ingresando…');
  });
});

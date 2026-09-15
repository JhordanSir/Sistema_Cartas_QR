import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LocaleProvider } from '@/i18n/locale-provider';

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

  it('trata como credenciales erróneas lo que la API rechaza por su forma', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400 });
    render(<OwnerLoginForm />);

    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: 'Entrar a mi restaurante' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El correo o la contraseña no son correctos.',
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

  it('no envía un correo con formato inválido y explica cómo escribirlo', () => {
    global.fetch = jest.fn();
    render(<OwnerLoginForm />);

    fireEvent.change(screen.getByLabelText('Correo del propietario'), {
      target: { value: 'hola@turestaurante' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'OwnerPass-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar a mi restaurante' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Escribe un correo válido, por ejemplo nombre@dominio.com.',
    );
    expect(screen.getByLabelText('Correo del propietario')).toHaveAttribute('aria-invalid', 'true');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('revisa el correo al pasar a la contraseña y retira el aviso en cuanto se corrige', () => {
    render(<OwnerLoginForm />);
    const email = screen.getByLabelText('Correo del propietario');

    fireEvent.change(email, { target: { value: 'sin-arroba' } });
    fireEvent.blur(email, { relatedTarget: screen.getByLabelText('Contraseña') });
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un correo válido');

    fireEvent.change(email, { target: { value: 'hola@turestaurante.pe' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(email).not.toHaveAttribute('aria-invalid');
  });

  it('no desplaza lo que se está pulsando: salir del correo hacia un botón no añade avisos', () => {
    render(<OwnerLoginForm />);
    const email = screen.getByLabelText('Correo del propietario');

    fireEvent.change(email, { target: { value: 'sin-arroba' } });
    fireEvent.blur(email, {
      relatedTarget: screen.getByRole('button', { name: 'Entrar a mi restaurante' }),
    });
    fireEvent.blur(email, { relatedTarget: screen.getByRole('button', { name: 'Mostrar' }) });
    // Safari no enfoca los botones al pulsarlos: el foco no va a ningún elemento.
    fireEvent.blur(email, { relatedTarget: null });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('pide la contraseña cuando se envía vacía y retira el aviso al escribirla', () => {
    global.fetch = jest.fn();
    render(<OwnerLoginForm />);

    fireEvent.change(screen.getByLabelText('Correo del propietario'), {
      target: { value: 'hola@turestaurante.pe' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar a mi restaurante' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Escribe tu contraseña.');
    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'OwnerPass-1' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('recomienda una contraseña más fuerte sin impedir entrar al insistir', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    render(<OwnerLoginForm />);

    fireEvent.change(screen.getByLabelText('Correo del propietario'), {
      target: { value: 'hola@turestaurante.pe' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'contraseña-antigua' },
    });
    const submit = screen.getByRole('button', { name: 'Entrar a mi restaurante' });
    fireEvent.click(submit);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Recomendamos mayúscula, minúscula y número.',
    );
    expect(screen.getByLabelText('Contraseña')).not.toHaveAttribute('aria-invalid');
    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.click(submit);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin'));
  });

  it('vuelve a avisar si se cambia por otra contraseña que tampoco cumple', () => {
    global.fetch = jest.fn();
    render(<OwnerLoginForm />);

    fireEvent.change(screen.getByLabelText('Correo del propietario'), {
      target: { value: 'hola@turestaurante.pe' },
    });
    const password = screen.getByLabelText('Contraseña');
    const submit = screen.getByRole('button', { name: 'Entrar a mi restaurante' });

    fireEvent.change(password, { target: { value: 'primera-debil' } });
    fireEvent.click(submit);
    fireEvent.change(password, { target: { value: 'segunda-debil' } });
    fireEvent.click(submit);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('habla inglés de principio a fin cuando la interfaz está en inglés', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    render(
      <LocaleProvider locale="en">
        <OwnerLoginForm />
      </LocaleProvider>,
    );

    const email = screen.getByLabelText('Owner email');
    const submit = screen.getByRole('button', { name: 'Go to my restaurant' });
    fireEvent.change(email, { target: { value: 'hola@turestaurante' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'legacy-password' } });
    fireEvent.click(submit);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a valid email, for example name@domain.com.',
    );
    expect(screen.getByRole('status')).toHaveTextContent('We recommend an uppercase letter');
    expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument();

    fireEvent.change(email, { target: { value: 'hola@turestaurante.pe' } });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(await screen.findByText('The email or password is incorrect.')).toBeInTheDocument();
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

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LocaleProvider } from '@/i18n/locale-provider';

import { LanguageSwitcher } from './language-switcher';

const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => refresh.mockReset());

  it('es un desplegable etiquetado con cada idioma escrito en sí mismo', () => {
    render(<LanguageSwitcher />);

    const select = screen.getByRole('combobox', { name: 'Idioma' });
    expect(select).toHaveValue('es');
    expect(screen.getByRole('option', { name: 'Español' })).toHaveAttribute('lang', 'es');
    expect(screen.getByRole('option', { name: 'English' })).toHaveAttribute('lang', 'en');
  });

  it('se anuncia en inglés cuando la interfaz ya está en inglés', () => {
    render(
      <LocaleProvider locale="en">
        <LanguageSwitcher />
      </LocaleProvider>,
    );

    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
  });

  it('guarda el idioma elegido y vuelve a pintar la página en él', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 });
    render(<LanguageSwitcher />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Idioma' }), {
      target: { value: 'en' },
    });

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/session/locale');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ locale: 'en' });
  });

  it.each([
    ['el servidor lo rechaza', () => jest.fn().mockResolvedValue({ ok: false, status: 403 })],
    ['no hay conexión', () => jest.fn().mockRejectedValue(new TypeError('Failed to fetch'))],
  ])('conserva el idioma actual si %s', async (_label, makeFetch) => {
    global.fetch = makeFetch();
    render(<LanguageSwitcher />);
    const select = screen.getByRole('combobox', { name: 'Idioma' });

    fireEvent.change(select, { target: { value: 'en' } });

    await waitFor(() => expect(select).toHaveValue('es'));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('no hace nada al volver a elegir el idioma que ya está activo', () => {
    global.fetch = jest.fn();
    render(<LanguageSwitcher />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Idioma' }), {
      target: { value: 'es' },
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});

import { render, screen } from '@testing-library/react';

import type { Locale } from '@/i18n/locale';
import { LocaleProvider } from '@/i18n/locale-provider';
import { getLocale } from '@/i18n/server';

import HomePage from './page';

jest.mock('@/i18n/server', () => ({ getLocale: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

async function renderHome(locale: Locale = 'es') {
  jest.mocked(getLocale).mockResolvedValue(locale);
  const page = await HomePage();
  return render(<LocaleProvider locale={locale}>{page}</LocaleProvider>);
}

describe('HomePage', () => {
  it('explica el sistema y dirige al propietario a su acceso', async () => {
    await renderHome();

    expect(screen.getByRole('heading', { name: /tu carta trabaja/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ingresar a mi restaurante/i })).toHaveAttribute(
      'href',
      '/admin/login',
    );
  });

  it('ofrece un único acceso de administración, en el pie', async () => {
    await renderHome();

    // Duplicarlo en cabecera y pie haría ambiguo getByRole en las suites.
    const admin = screen.getAllByRole('link', { name: 'Administración' });
    expect(admin).toHaveLength(1);
    expect(admin[0]).toHaveAttribute('href', '/login');
  });

  it('mantiene el acceso del dueño visible arriba sin desbordar la cabecera', async () => {
    await renderHome();

    const shortcuts = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/admin/login');
    expect(shortcuts).toHaveLength(2);
    expect(shortcuts.map((link) => link.textContent)).toEqual(
      expect.arrayContaining(['Ingresar']),
    );
  });

  it('responde las dudas frecuentes sin depender de JavaScript', async () => {
    const { container } = await renderHome();

    const questions = container.querySelectorAll('details');
    expect(questions.length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText('¿El QR cambia si actualizo mi carta?')).toBeVisible();
    expect(screen.getByText(/El código se imprime una sola vez/)).toBeInTheDocument();
  });

  it('muestra el producto en lugar de un logotipo, y lo oculta a los lectores de pantalla', async () => {
    const { container } = await renderHome();

    // La vista previa es decorativa: su contenido no debe leerse como si fuera
    // una carta real de un restaurante existente.
    const preview = container.querySelector('[aria-hidden="true"] .grid-cols-5');
    expect(preview).not.toBeNull();
    expect(screen.queryByAltText('Logo de Sirio Automatiza')).toBeNull();
  });

  it('ofrece el selector de idioma en la cabecera, junto al acceso', async () => {
    const { container } = await renderHome();

    const header = container.querySelector('header');
    expect(header).not.toBeNull();
    expect(header?.querySelector('select')).toHaveAccessibleName('Idioma');
  });

  it('se lee entera en inglés, con los precios en PEN y los platos sin traducir', async () => {
    const { container } = await renderHome('en');

    expect(screen.getByRole('heading', { name: /your menu works while you serve/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /sign in to my restaurant/i })).toHaveAttribute(
      'href',
      '/admin/login',
    );
    expect(screen.getByRole('link', { name: 'Administration' })).toHaveAttribute('href', '/login');
    expect(screen.getByText('Does the QR change if I update my menu?')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en');

    const preview = container.textContent?.replace(/ /g, ' ') ?? '';
    expect(preview).toContain('PEN 38.00');
    expect(preview).toContain('Ceviche clásico');
    expect(screen.queryByText(/tu carta trabaja/i)).toBeNull();
  });
});

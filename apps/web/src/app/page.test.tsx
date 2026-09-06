import { render, screen } from '@testing-library/react';

import HomePage from './page';

describe('HomePage', () => {
  it('explica el sistema y dirige al propietario a su acceso', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: /tu carta trabaja/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ingresar a mi restaurante/i })).toHaveAttribute(
      'href',
      '/admin/login',
    );
  });

  it('ofrece un único acceso de administración, en el pie', () => {
    render(<HomePage />);

    // Duplicarlo en cabecera y pie haría ambiguo getByRole en las suites.
    const admin = screen.getAllByRole('link', { name: 'Administración' });
    expect(admin).toHaveLength(1);
    expect(admin[0]).toHaveAttribute('href', '/login');
  });

  it('mantiene el acceso del dueño visible arriba sin desbordar la cabecera', () => {
    render(<HomePage />);

    const shortcuts = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/admin/login');
    expect(shortcuts).toHaveLength(2);
    expect(shortcuts.map((link) => link.textContent)).toEqual(
      expect.arrayContaining(['Ingresar']),
    );
  });

  it('responde las dudas frecuentes sin depender de JavaScript', () => {
    const { container } = render(<HomePage />);

    const questions = container.querySelectorAll('details');
    expect(questions.length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText('¿El QR cambia si actualizo mi carta?')).toBeVisible();
    expect(
      screen.getByText(/El código se imprime una sola vez/),
    ).toBeInTheDocument();
  });

  it('muestra el producto en lugar de un logotipo, y lo oculta a los lectores de pantalla', () => {
    const { container } = render(<HomePage />);

    // La vista previa es decorativa: su contenido no debe leerse como si fuera
    // una carta real de un restaurante existente.
    const preview = container.querySelector('[aria-hidden="true"] .grid-cols-5');
    expect(preview).not.toBeNull();
    expect(screen.queryByAltText('Logo de Sirio Automatiza')).toBeNull();
  });
});

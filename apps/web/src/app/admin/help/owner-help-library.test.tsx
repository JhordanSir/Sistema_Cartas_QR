import { render, screen } from '@testing-library/react';

import { OwnerHelpLibrary } from './owner-help-library';
import { ownerTutorials } from './tutorials';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ''} />
  ),
}));

describe('OwnerHelpLibrary', () => {
  it('presenta las cinco guías escritas y marca Ayuda en la navegación', () => {
    const { container } = render(<OwnerHelpLibrary />);

    expect(
      screen.getByRole('heading', { name: 'Aprende a manejar tu carta desde el celular.' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ayuda' })).toHaveAttribute('aria-current', 'page');

    for (const tutorial of ownerTutorials) {
      expect(screen.getByText(tutorial.title)).toBeVisible();
    }
    expect(container.querySelectorAll('details')).toHaveLength(ownerTutorials.length);
  });

  it('ya no incrusta los videos de la interfaz anterior', () => {
    const { container } = render(<OwnerHelpLibrary />);

    expect(container.querySelectorAll('video')).toHaveLength(0);
    expect(container.querySelectorAll('track')).toHaveLength(0);
  });

  it('detalla cada paso y enlaza a la pantalla que corresponde', () => {
    render(<OwnerHelpLibrary />);

    // La primera guía viene desplegada, así que sus pasos sí deben verse.
    const first = ownerTutorials[0];
    expect(first?.steps.length).toBeGreaterThan(0);
    for (const step of first?.steps ?? []) {
      expect(screen.getByText(step)).toBeVisible();
    }

    // Las demás están plegadas: su contenido existe en el documento, listo para
    // que el navegador lo muestre al abrir el detalle, sin depender de JavaScript.
    for (const tutorial of ownerTutorials.slice(1)) {
      for (const step of tutorial.steps) {
        expect(screen.getByText(step)).toBeInTheDocument();
      }
    }

    expect(screen.getByRole('link', { name: /Ir a QR/ })).toHaveAttribute('href', '/admin/qr');
    expect(screen.getByRole('link', { name: /Ir a Perfil/ })).toHaveAttribute('href', '/admin');
  });

  it('abre la primera guía y deja las demás plegadas', () => {
    const { container } = render(<OwnerHelpLibrary />);

    const panels = Array.from(container.querySelectorAll('details'));
    expect(panels[0]).toHaveAttribute('open');
    for (const panel of panels.slice(1)) {
      expect(panel).not.toHaveAttribute('open');
    }
  });
});

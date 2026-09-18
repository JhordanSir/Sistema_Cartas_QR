import { fireEvent, render, screen } from '@testing-library/react';

import PdfPruebaPage from './page';

describe('PdfPruebaPage', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it('renderiza la cabecera con el nombre de KAI Sushi & Bar y el enlace de descarga', () => {
    render(<PdfPruebaPage />);

    expect(screen.getByRole('heading', { name: /KAI Sushi & Bar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Descargar PDF/i })).toHaveAttribute(
      'href',
      '/pdf/prueba.pdf',
    );
  });

  it('permite cambiar entre pestañas de Visor HD, Lector PDF y Lista de Platos', () => {
    render(<PdfPruebaPage />);

    const imgTab = screen.getByRole('button', { name: /Visor HD/i });
    const pdfTab = screen.getByRole('button', { name: /Lector PDF Nativo/i });
    const menuTab = screen.getByRole('button', { name: /Lista de Platos/i });

    expect(imgTab).toBeInTheDocument();
    expect(pdfTab).toBeInTheDocument();
    expect(menuTab).toBeInTheDocument();

    // Verificamos la imagen en la pestaña Visor HD
    expect(screen.getByRole('img', { name: /Carta KAI Sushi & Bar/i })).toHaveAttribute(
      'src',
      '/pdf/carta-prueba.jpg',
    );

    // Cambiamos a la lista de platos
    fireEvent.click(menuTab);
    expect(screen.getByText('ENTRADAS')).toBeInTheDocument();
    expect(screen.getByText('Sakana tzusumiage')).toBeInTheDocument();
    expect(screen.getByText('Moriawase Kai')).toBeInTheDocument();

    // Cambiamos al lector PDF
    fireEvent.click(pdfTab);
    expect(screen.getByTitle('Lector PDF Carta KAI')).toBeInTheDocument();
  });

  it('ofrece controles de zoom en el visor interactivo', () => {
    render(<PdfPruebaPage />);

    const zoomIn = screen.getByRole('button', { name: /Aumentar zoom/i });
    const zoomOut = screen.getByRole('button', { name: /Reducir zoom/i });
    const resetZoom = screen.getByRole('button', { name: /Restablecer zoom/i });

    expect(zoomIn).toBeInTheDocument();
    expect(zoomOut).toBeInTheDocument();
    expect(resetZoom).toBeInTheDocument();
    expect(resetZoom).toHaveTextContent('100%');

    fireEvent.click(zoomIn);
    expect(resetZoom).toHaveTextContent('135%');

    fireEvent.click(resetZoom);
    expect(resetZoom).toHaveTextContent('100%');
  });
});

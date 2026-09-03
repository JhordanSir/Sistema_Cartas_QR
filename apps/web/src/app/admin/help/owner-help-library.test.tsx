import { render, screen } from '@testing-library/react';

import { OwnerHelpLibrary } from './owner-help-library';

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
  it('shows five captioned vertical tutorials and highlights Help in the owner navigation', () => {
    const { container } = render(<OwnerHelpLibrary />);

    expect(screen.getByRole('heading', { name: 'Aprende a manejar tu carta desde el celular.' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ayuda' })).toHaveAttribute('aria-current', 'page');
    expect(container.querySelectorAll('video')).toHaveLength(5);
    expect(container.querySelectorAll('video[controls][playsinline]')).toHaveLength(5);
    expect(container.querySelectorAll('video[poster^="/tutorials/"]')).toHaveLength(5);
    expect(container.querySelectorAll('track[kind="subtitles"][srclang="es"]')).toHaveLength(5);
    expect(screen.getByText('Comparte tu QR')).toBeVisible();
  });
});

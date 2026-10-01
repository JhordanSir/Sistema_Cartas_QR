import type { Metadata, Viewport } from 'next';

import './globals.css';

export const metadata: Metadata = {
  description: 'Cartas digitales para restaurantes, publicadas con un QR que nunca cambia.',
  title: { default: 'Sirio Cartas', template: '%s · Sirio Cartas' },
};

export const viewport: Viewport = {
  themeColor: '#fbf7f0',
};

// No fonts here: each surface (panel or public menu) loads its own.
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}

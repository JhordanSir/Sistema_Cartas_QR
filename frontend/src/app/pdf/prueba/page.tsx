import type { Metadata } from 'next';

import { shellFontClassName } from '@/lib/fonts';

import { PdfPruebaViewer } from './pdf-prueba-viewer';

export const metadata: Metadata = {
  title: 'Carta KAI Sushi & Bar | Menú Digital PDF - Sirio',
  description:
    'Visualiza la carta digital completa de KAI Sushi & Bar: Entradas, Agemonos, Sashimi, Nigiris, Gunkan y Nigiris Especiales. Menú digital en formato interactivo y PDF.',
  openGraph: {
    title: 'Carta KAI Sushi & Bar | Menú Digital PDF',
    description:
      'Carta digital oficial de KAI Sushi & Bar. Visualiza platos, precios y opciones en alta definición.',
    images: [
      {
        url: '/pdf/carta-prueba.jpg',
        width: 1024,
        height: 768,
        alt: 'Carta KAI Sushi & Bar',
      },
    ],
  },
};

export default function PdfPruebaPage() {
  return (
    <div className={`min-h-dvh bg-[#0b0c10] ${shellFontClassName}`}>
      <PdfPruebaViewer />
    </div>
  );
}

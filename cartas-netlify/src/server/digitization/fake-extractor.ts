import type { MenuExtractor } from './extractor';

/** The fixed menu of the simulated extractor: 2 sections and 5 products, one with variants. */
export const SAMPLE_EXTRACTED_MENU = {
  categories: [
    {
      name: 'Entradas',
      products: [
        {
          basePrice: 28,
          description: 'Pescado del día en leche de tigre, camote y choclo.',
          extras: [],
          name: 'Ceviche clásico',
          variants: [
            { name: 'Personal', price: 28 },
            { name: 'Para compartir', price: 45.5 },
          ],
        },
        { basePrice: 18, description: null, extras: [], name: 'Causa limeña', variants: [] },
        { basePrice: 22, description: 'Con salsa de olivo.', extras: [], name: 'Pulpo al olivo', variants: [] },
      ],
    },
    {
      name: 'Fondos',
      products: [
        {
          basePrice: 45.9,
          description: 'Arroz meloso con mariscos frescos.',
          extras: [{ name: 'Salsa criolla', price: 2 }],
          name: 'Arroz con mariscos',
          variants: [],
        },
        { basePrice: 39, description: null, extras: [], name: 'Chicharrón de pescado', variants: [] },
      ],
    },
  ],
  style: { backgroundColor: '#fff8ed', fontFamily: 'Lato', textColor: '#3d2a20' },
} as const;

/**
 * Stands in for Gemini in the local end-to-end tests (DIGITIZATION_FAKE=1):
 * waits and returns the sample menu, which still goes through parseExtractedMenu.
 */
export function createFakeExtractor({ delayMs = 5000 }: { delayMs?: number } = {}): MenuExtractor {
  return {
    async extractMenu() {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return structuredClone(SAMPLE_EXTRACTED_MENU);
    },
  };
}

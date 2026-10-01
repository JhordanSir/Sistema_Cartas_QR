import type { Page } from '@playwright/test';

/** A valid 1×1 PNG: small enough to be uploaded as is. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64',
);

/** Text that pretends to be a PNG: only its name and declared type say so. */
export const TEXT_AS_PNG = Buffer.from('Hola, no soy una imagen aunque me llame logo.png');

/** A PNG of the given size drawn by the browser itself (a gradient with shapes). */
export async function drawPng(page: Page, width: number, height: number): Promise<Buffer> {
  const base64 = await page.evaluate(
    async ({ height, width }) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No 2D context');
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#8c2f39');
      gradient.addColorStop(1, '#fbf7f0');
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      context.fillStyle = '#1f1b16';
      context.font = `${Math.round(height / 4)}px serif`;
      context.fillText('Sirio', width / 10, height / 2);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('No PNG');
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary);
    },
    { height, width },
  );
  return Buffer.from(base64, 'base64');
}

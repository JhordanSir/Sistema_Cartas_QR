'use client';

import { IMAGE_MAX_SIDE, IMAGE_MESSAGES, JPEG_QUALITY } from '@/shared/images';

const UPLOADABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type PreparedImage = { ok: true; file: File } | { ok: false; error: string };

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
}

function jpegName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '') || 'imagen';
  return `${base}.jpg`;
}

/**
 * Gets an image ready to upload (§E6). A PNG, JPEG or WebP that already fits
 * goes as is, so a small logo keeps its transparency. Anything bigger, wider
 * than `maxSide` or of another format is redrawn as JPEG (quality 0.85) on a
 * white background. If even that does not fit, nothing is sent.
 */
export async function prepareImage(
  file: File,
  { maxBytes, maxSide = IMAGE_MAX_SIDE, tooLargeMessage }: {
    maxBytes: number;
    maxSide?: number;
    tooLargeMessage: string;
  },
): Promise<PreparedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return { error: IMAGE_MESSAGES.unreadable, ok: false };
  }

  try {
    const longestSide = Math.max(bitmap.width, bitmap.height);
    if (file.size <= maxBytes && longestSide <= maxSide && UPLOADABLE_TYPES.has(file.type)) {
      return { file, ok: true };
    }

    const scale = Math.min(1, maxSide / longestSide);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return { error: IMAGE_MESSAGES.unreadable, ok: false };
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const jpeg = await canvasToJpeg(canvas);
    if (!jpeg) return { error: IMAGE_MESSAGES.unreadable, ok: false };
    if (jpeg.size > maxBytes) return { error: tooLargeMessage, ok: false };
    return { file: new File([jpeg], jpegName(file.name), { type: 'image/jpeg' }), ok: true };
  } finally {
    bitmap.close();
  }
}

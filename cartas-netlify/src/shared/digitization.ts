import { GENERIC_ERROR_MESSAGE } from './messages';

// Digitization jobs (§E10): limits, texts and the shape the API answers.

const MEGABYTE = 1024 * 1024;

export const DIGITIZATION_LIMITS = {
  /** Longest side after compressing in the browser (§E6). */
  maxSide: 2000,
  maxPhotoBytes: 3 * MEGABYTE,
  maxPhotos: 5,
  maxTotalBytes: 12 * MEGABYTE,
  minPhotos: 1,
} as const;

/** A job older than this no longer counts as active (§E10 maintenance). */
export const STALE_UPLOADING_MS = 60 * 60_000;
export const STALE_PROCESSING_MS = 20 * 60_000;

export type DigitizationStatus = 'UPLOADING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';

export type DigitizationJobView = {
  id: string;
  status: DigitizationStatus;
  photoCount: number;
  errorCode: string | null;
};

export const DIGITIZATION_TEXTS = {
  processing: 'Leyendo tu carta con IA (puede tardar hasta 2 minutos)…',
  replaceWarning:
    'La carta digitalizada reemplazará todo tu borrador actual. Tu carta publicada no cambia hasta que publiques.',
  succeeded: 'Carta digitalizada. Revísala y publícala cuando esté lista.',
  uploading: 'Subiendo fotos…',
} as const;

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_MODEL_RESPONSE: 'Gemini no pudo interpretar una carta válida. Prueba con fotos más nítidas.',
  MODEL_CONFIGURATION_ERROR: 'Gemini no está configurado correctamente. Contacta al administrador.',
  MODEL_TIMEOUT: 'Gemini tardó demasiado en responder. Inténtalo nuevamente.',
  MODEL_UNAVAILABLE: 'Gemini no está disponible temporalmente. Inténtalo en unos minutos.',
  UPLOAD_ABANDONED: 'La subida de las fotos no terminó. Elige las fotos otra vez.',
};

/** The message a failed job shows; unknown codes get the generic one. */
export function digitizationErrorMessage(code: string | null): string {
  return (code && ERROR_MESSAGES[code]) || GENERIC_ERROR_MESSAGE;
}

const STATUSES: readonly DigitizationStatus[] = ['UPLOADING', 'PROCESSING', 'SUCCEEDED', 'FAILED'];

/** The `job` of an API response, or null when it is missing or has another shape. */
export function parseDigitizationJob(data: unknown): DigitizationJobView | null {
  if (typeof data !== 'object' || data === null || !('job' in data)) return null;
  const { job } = data;
  if (typeof job !== 'object' || job === null) return null;
  const { errorCode, id, photoCount, status } = job as Record<string, unknown>;
  if (typeof id !== 'string' || typeof photoCount !== 'number') return null;
  if (!STATUSES.includes(status as DigitizationStatus)) return null;
  if (errorCode !== null && typeof errorCode !== 'string') return null;
  return { errorCode, id, photoCount, status: status as DigitizationStatus };
}

/** «1.2 MB» / «850 KB» for the thumbnails of the chosen photos (es-PE uses a decimal point). */
export function formatFileSize(bytes: number): string {
  if (bytes >= MEGABYTE) {
    return `${new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 }).format(bytes / MEGABYTE)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

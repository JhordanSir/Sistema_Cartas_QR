import type { ImageMimeType } from '../../shared/images';

// The piece that turns photos into a menu (§E10) is swappable: phase 9 uses a
// simulated extractor; phase 10 adds Gemini behind the same interface.

export type ExtractorPhoto = { data: Uint8Array; mimeType: ImageMimeType };

export interface MenuExtractor {
  /** The raw menu, still unvalidated: parseExtractedMenu decides if it is usable. */
  extractMenu(photos: readonly ExtractorPhoto[]): Promise<unknown>;
}

export type ExtractionErrorCode =
  | 'INVALID_MODEL_RESPONSE'
  | 'MODEL_CONFIGURATION_ERROR'
  | 'MODEL_TIMEOUT'
  | 'MODEL_UNAVAILABLE';

/** A failure with one of the codes of §E10; the job ends FAILED with that code. */
export class ExtractionError extends Error {
  constructor(
    readonly code: ExtractionErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'ExtractionError';
  }
}

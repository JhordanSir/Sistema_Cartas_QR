import { ApiError, GoogleGenAI, type GenerateContentParameters } from '@google/genai';

import { ExtractionError, type ExtractionErrorCode, type ExtractorPhoto, type MenuExtractor } from './extractor';
import { MENU_EXTRACTION_PROMPT, MENU_EXTRACTION_SCHEMA } from './gemini-prompt';

/** Explicit, so that Netlify's AI Gateway is never used by accident (§E10). */
export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const TIMEOUT_MS = 120_000;
const MAX_RETRIES = 2;

export type GeminiExtractorOptions = {
  apiKey: string | undefined;
  model?: string | undefined;
  /** For tests: replaces the HTTP transport of the SDK. */
  fetch?: typeof fetch;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

type Failure = { code: ExtractionErrorCode; detail: string; retryable: boolean };

/**
 * Reads the menu from the photos with Gemini (§E10). It retries up to twice
 * after a 408, 429, 5xx, timeout or dropped connection, waiting
 * 500 ms × 2^attempt plus up to 250 ms, and fails with an ExtractionError.
 */
export function createGeminiExtractor(options: GeminiExtractorOptions): MenuExtractor {
  const model = options.model?.trim() || DEFAULT_GEMINI_MODEL;
  const random = options.random ?? Math.random;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  return {
    async extractMenu(photos) {
      const apiKey = options.apiKey?.trim();
      if (!apiKey) throw new ExtractionError('MODEL_CONFIGURATION_ERROR', 'SIRIO_GEMINI_API_KEY is not set.');

      const client = new GoogleGenAI({
        apiKey,
        httpOptions: { baseUrl: GEMINI_BASE_URL, timeout: TIMEOUT_MS, ...(options.fetch && { fetch: options.fetch }) },
        vertexai: false,
      });
      const request = buildRequest(model, photos);

      for (let attempt = 0; ; attempt += 1) {
        let text: string | undefined;
        try {
          text = (await client.models.generateContent(request)).text;
        } catch (error) {
          const failure = classify(error);
          if (!failure.retryable || attempt >= MAX_RETRIES) throw new ExtractionError(failure.code, failure.detail);
          await sleep(500 * 2 ** attempt + Math.floor(random() * 250));
          continue;
        }
        return parseResponseText(text);
      }
    },
  };
}

function buildRequest(model: string, photos: readonly ExtractorPhoto[]): GenerateContentParameters {
  return {
    config: {
      responseJsonSchema: MENU_EXTRACTION_SCHEMA,
      responseMimeType: 'application/json',
      ...temperatureFor(model),
    },
    contents: [
      {
        parts: [
          { text: MENU_EXTRACTION_PROMPT },
          ...photos.map((photo) => ({
            inlineData: { data: Buffer.from(photo.data).toString('base64'), mimeType: photo.mimeType },
          })),
        ],
        role: 'user',
      },
    ],
    model,
  };
}

/**
 * §E10 asks for 0.1, which is right for the 2.x line. For Gemini 3 and later
 * Google recommends keeping the default (1.0): below it they may loop.
 */
function temperatureFor(model: string): { temperature?: number } {
  return /^gemini-[12]\./.test(model) ? { temperature: 0.1 } : {};
}

function parseResponseText(text: string | undefined): unknown {
  // No text: the answer was blocked or came back empty.
  if (!text?.trim()) throw new ExtractionError('INVALID_MODEL_RESPONSE', 'Gemini returned no text.');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ExtractionError('INVALID_MODEL_RESPONSE', 'Gemini returned text that is not JSON.');
  }
}

const UNDICI_TIMEOUTS = new Set(['UND_ERR_BODY_TIMEOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT']);

function classify(error: unknown): Failure {
  if (error instanceof ApiError) {
    const detail = `Gemini responded ${error.status}: ${error.message.slice(0, 300)}`;
    if (error.status === 408 || error.status === 504) return { code: 'MODEL_TIMEOUT', detail, retryable: true };
    if (error.status === 429 || error.status >= 500) return { code: 'MODEL_UNAVAILABLE', detail, retryable: true };
    // 400, 401, 403, 404…: a wrong key, model or schema will not fix itself.
    return { code: 'MODEL_CONFIGURATION_ERROR', detail, retryable: false };
  }
  if (isTimeout(error)) return { code: 'MODEL_TIMEOUT', detail: 'Gemini did not answer in time.', retryable: true };
  if (error instanceof SyntaxError) {
    return { code: 'INVALID_MODEL_RESPONSE', detail: 'Gemini answered with a body that is not JSON.', retryable: false };
  }
  // A dropped connection ("fetch failed", ECONNRESET…) is as transient as a 5xx.
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return { code: 'MODEL_UNAVAILABLE', detail: `Gemini request failed. ${detail}`, retryable: true };
}

function isTimeout(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ('name' in error && (error.name === 'AbortError' || error.name === 'TimeoutError')) return true;
  const cause = 'cause' in error ? error.cause : null;
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'code' in cause &&
    typeof cause.code === 'string' &&
    UNDICI_TIMEOUTS.has(cause.code)
  );
}

import {
  MENU_EXTRACTION_PROMPT,
  MENU_EXTRACTION_RESPONSE_SCHEMA,
} from '../application/menu-extraction.prompt.js';
import type { MenuExtractionGateway } from '../application/ports/menu-extraction.gateway.js';
import { MenuExtractionGatewayError } from '../domain/digitization.errors.js';
import type { MenuPhoto } from '../domain/menu.types.js';

const DEFAULT_API_BASE_URL = 'https://generativelanguage.googleapis.com';
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_OPEN_MS = 30_000;

export interface GeminiMenuExtractionOptions {
  apiBaseUrl?: string;
  apiKey: string;
  fetchImplementation?: typeof fetch;
  maximumRetries: number;
  model: string;
  random?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  timeoutMilliseconds: number;
}

export class GeminiMenuExtractionGateway implements MenuExtractionGateway {
  private circuitFailures = 0;
  private circuitOpenUntil = 0;
  private readonly apiBaseUrl: string;
  private readonly fetchImplementation: typeof fetch;
  private readonly random: () => number;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(private readonly options: GeminiMenuExtractionOptions) {
    this.apiBaseUrl = (options.apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.random = options.random ?? Math.random;
    this.sleep =
      options.sleep ??
      ((milliseconds): Promise<void> =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  async extract(photos: MenuPhoto[]): Promise<unknown> {
    if (Date.now() < this.circuitOpenUntil) {
      throw new MenuExtractionGatewayError(
        'UNAVAILABLE',
        'Gemini circuit is temporarily open.',
      );
    }

    try {
      const result = await this.executeWithRetries(photos);
      this.circuitFailures = 0;
      this.circuitOpenUntil = 0;
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private async executeWithRetries(photos: MenuPhoto[]): Promise<unknown> {
    for (let attempt = 0; attempt <= this.options.maximumRetries; attempt += 1) {
      try {
        const response = await this.fetchImplementation(
          `${this.apiBaseUrl}/v1beta/models/${encodeURIComponent(this.options.model)}:generateContent`,
          {
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: MENU_EXTRACTION_PROMPT },
                    ...photos.map((photo) => ({
                      inlineData: {
                        data: Buffer.from(photo.bytes).toString('base64'),
                        mimeType: photo.contentType,
                      },
                    })),
                  ],
                  role: 'user',
                },
              ],
              generationConfig: {
                responseJsonSchema: MENU_EXTRACTION_RESPONSE_SCHEMA,
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            }),
            headers: {
              'content-type': 'application/json',
              'x-goog-api-key': this.options.apiKey,
            },
            method: 'POST',
            signal: AbortSignal.timeout(this.options.timeoutMilliseconds),
          },
        );

        if (!response.ok) {
          const retryable = isRetryableStatus(response.status);
          if (retryable && attempt < this.options.maximumRetries) {
            await this.waitBeforeRetry(attempt);
            continue;
          }
          throw new MenuExtractionGatewayError(
            retryable ? 'UNAVAILABLE' : 'CONFIGURATION',
            `Gemini request failed with status ${response.status}.`,
          );
        }

        return await readStructuredResponse(response);
      } catch (error) {
        if (error instanceof MenuExtractionGatewayError) throw error;
        const timeout = isTimeoutError(error);
        if (attempt < this.options.maximumRetries) {
          await this.waitBeforeRetry(attempt);
          continue;
        }
        throw new MenuExtractionGatewayError(
          timeout ? 'TIMEOUT' : 'UNAVAILABLE',
          timeout ? 'Gemini request timed out.' : 'Gemini request failed.',
          { cause: error },
        );
      }
    }
    throw new MenuExtractionGatewayError('UNAVAILABLE', 'Gemini request failed.');
  }

  private async waitBeforeRetry(attempt: number): Promise<void> {
    const exponentialMilliseconds = 500 * 2 ** attempt;
    const jitterMilliseconds = Math.floor(this.random() * 250);
    await this.sleep(exponentialMilliseconds + jitterMilliseconds);
  }

  private recordFailure(): void {
    this.circuitFailures += 1;
    if (this.circuitFailures >= CIRCUIT_FAILURE_THRESHOLD) {
      this.circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
    }
  }
}

async function readStructuredResponse(response: Response): Promise<unknown> {
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new MenuExtractionGatewayError('RESPONSE', 'Gemini returned invalid JSON.', {
      cause: error,
    });
  }
  const text = findCandidateText(body);
  if (!text) {
    throw new MenuExtractionGatewayError('RESPONSE', 'Gemini returned no structured menu.');
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new MenuExtractionGatewayError(
      'RESPONSE',
      'Gemini structured menu could not be decoded.',
      { cause: error },
    );
  }
}

function findCandidateText(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const candidates = (body as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) return null;
  for (const candidate of candidates) {
    const content = typeof candidate === 'object' && candidate !== null
      ? (candidate as { content?: unknown }).content
      : null;
    const parts = typeof content === 'object' && content !== null
      ? (content as { parts?: unknown }).parts
      : null;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      if (typeof part === 'object' && part !== null && typeof (part as { text?: unknown }).text === 'string') {
        return (part as { text: string }).text;
      }
    }
  }
  return null;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    ['AbortError', 'TimeoutError'].includes(error.name)
  );
}

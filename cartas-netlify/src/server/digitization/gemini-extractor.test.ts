import { describe, expect, it, vi } from 'vitest';

import { ExtractionError, type ExtractorPhoto } from './extractor';
import { SAMPLE_EXTRACTED_MENU } from './fake-extractor';
import { createGeminiExtractor } from './gemini-extractor';
import { MENU_EXTRACTION_PROMPT, MENU_EXTRACTION_SCHEMA } from './gemini-prompt';

const PNG_HEADER = new Uint8Array([137, 80, 78, 71]);
const photos: ExtractorPhoto[] = [
  { data: PNG_HEADER, mimeType: 'image/png' },
  { data: new Uint8Array([255, 216, 255]), mimeType: 'image/jpeg' },
];

function geminiAnswer(text: string): Response {
  return Response.json({
    candidates: [{ content: { parts: [{ text }], role: 'model' }, finishReason: 'STOP', index: 0 }],
  });
}

function geminiError(status: number): Response {
  return Response.json({ error: { code: status, message: 'Fallo simulado', status: 'ERROR' } }, { status });
}

function setup(fetchImplementation: typeof fetch, model?: string) {
  const fetchMock = vi.fn(fetchImplementation);
  const sleep = vi.fn(async (ms: number) => {
    void ms;
  });
  const extractor = createGeminiExtractor({ apiKey: 'clave-de-prueba', fetch: fetchMock, model, random: () => 0.5, sleep });
  return { extractor, fetchMock, sleep };
}

type SentRequest = {
  contents: { parts: Record<string, unknown>[]; role: string }[];
  generationConfig: Record<string, unknown>;
};

function sentRequest(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>, call = 0) {
  const [input, init] = fetchMock.mock.calls[call] ?? [];
  return {
    body: JSON.parse(String(init?.body)) as SentRequest,
    headers: new Headers(init?.headers),
    url: String(input),
  };
}

describe('createGeminiExtractor', () => {
  it('envía el prompt, las fotos y el esquema a la URL de Google con la clave, y devuelve el menú', async () => {
    const { extractor, fetchMock } = setup(async () => geminiAnswer(JSON.stringify(SAMPLE_EXTRACTED_MENU)));

    await expect(extractor.extractMenu(photos)).resolves.toEqual(SAMPLE_EXTRACTED_MENU);

    expect(fetchMock).toHaveBeenCalledOnce();
    const { body, headers, url } = sentRequest(fetchMock);
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
    expect(headers.get('x-goog-api-key')).toBe('clave-de-prueba');
    expect(body.contents).toEqual([
      {
        parts: [
          { text: MENU_EXTRACTION_PROMPT },
          { inlineData: { data: 'iVBORw==', mimeType: 'image/png' } },
          { inlineData: { data: '/9j/', mimeType: 'image/jpeg' } },
        ],
        role: 'user',
      },
    ]);
    expect(body.generationConfig).toEqual({
      responseJsonSchema: JSON.parse(JSON.stringify(MENU_EXTRACTION_SCHEMA)),
      responseMimeType: 'application/json',
      temperature: 0.1,
    });
  });

  it('usa el modelo de GEMINI_MODEL; desde Gemini 3 deja la temperatura por defecto', async () => {
    const { extractor, fetchMock } = setup(async () => geminiAnswer('{}'), 'gemini-3.8-flash');

    await extractor.extractMenu(photos);

    const { body, url } = sentRequest(fetchMock);
    expect(url).toContain('/models/gemini-3.8-flash:generateContent');
    expect(body.generationConfig).not.toHaveProperty('temperature');
  });

  it.each([undefined, '', '   '])('sin clave (%j) termina con MODEL_CONFIGURATION_ERROR y no llama a Gemini', async (apiKey) => {
    const fetchMock = vi.fn<typeof fetch>();
    const extractor = createGeminiExtractor({ apiKey, fetch: fetchMock });

    await expect(extractor.extractMenu(photos)).rejects.toMatchObject({ code: 'MODEL_CONFIGURATION_ERROR' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('un texto que no es JSON termina con INVALID_MODEL_RESPONSE, sin reintentar', async () => {
    const { extractor, fetchMock } = setup(async () => geminiAnswer('Aquí está tu carta: Ceviche 28'));

    const result = extractor.extractMenu(photos);

    await expect(result).rejects.toBeInstanceOf(ExtractionError);
    await expect(result).rejects.toMatchObject({ code: 'INVALID_MODEL_RESPONSE' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('una respuesta bloqueada, sin texto, termina con INVALID_MODEL_RESPONSE', async () => {
    const { extractor } = setup(async () => Response.json({ promptFeedback: { blockReason: 'PROHIBITED_CONTENT' } }));

    await expect(extractor.extractMenu(photos)).rejects.toMatchObject({ code: 'INVALID_MODEL_RESPONSE' });
  });

  it('un cuerpo que no es JSON termina con INVALID_MODEL_RESPONSE', async () => {
    const { extractor } = setup(
      async () => new Response('<html>Error</html>', { headers: { 'content-type': 'text/html' }, status: 200 }),
    );

    await expect(extractor.extractMenu(photos)).rejects.toMatchObject({ code: 'INVALID_MODEL_RESPONSE' });
  });

  it('ante un 429 espera y reintenta; si después responde 200, devuelve el menú', async () => {
    const answers = [geminiError(429), geminiAnswer(JSON.stringify(SAMPLE_EXTRACTED_MENU))];
    const { extractor, fetchMock, sleep } = setup(async () => answers.shift() ?? geminiError(500));

    await expect(extractor.extractMenu(photos)).resolves.toEqual(SAMPLE_EXTRACTED_MENU);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    // 500 ms × 2^0 + 0.5 × 250 ms of jitter.
    expect(sleep.mock.calls).toEqual([[625]]);
  });

  it.each([
    [408, 'MODEL_TIMEOUT'],
    [429, 'MODEL_UNAVAILABLE'],
    [500, 'MODEL_UNAVAILABLE'],
    [503, 'MODEL_UNAVAILABLE'],
    [504, 'MODEL_TIMEOUT'],
  ])('un %i se reintenta dos veces y, si sigue, termina con %s', async (status, code) => {
    const { extractor, fetchMock, sleep } = setup(async () => geminiError(status));

    await expect(extractor.extractMenu(photos)).rejects.toMatchObject({ code });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[625], [1125]]);
  });

  it.each([400, 401, 403, 404])('un %i termina con MODEL_CONFIGURATION_ERROR, sin reintentar', async (status) => {
    const { extractor, fetchMock, sleep } = setup(async () => geminiError(status));

    await expect(extractor.extractMenu(photos)).rejects.toMatchObject({ code: 'MODEL_CONFIGURATION_ERROR' });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });

  it('un timeout se reintenta dos veces y termina con MODEL_TIMEOUT', async () => {
    const { extractor, fetchMock } = setup(async () => {
      throw new DOMException('This operation was aborted', 'AbortError');
    });

    await expect(extractor.extractMenu(photos)).rejects.toMatchObject({ code: 'MODEL_TIMEOUT' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('una conexión caída se reintenta; si vuelve, devuelve el menú', async () => {
    let calls = 0;
    const { extractor, fetchMock } = setup(async () => {
      calls += 1;
      if (calls === 1) throw new TypeError('fetch failed');
      return geminiAnswer(JSON.stringify(SAMPLE_EXTRACTED_MENU));
    });

    await expect(extractor.extractMenu(photos)).resolves.toEqual(SAMPLE_EXTRACTED_MENU);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

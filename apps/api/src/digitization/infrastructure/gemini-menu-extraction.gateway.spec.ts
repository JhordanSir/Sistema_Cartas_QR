import { GeminiMenuExtractionGateway } from './gemini-menu-extraction.gateway.js';

const PHOTO = {
  bytes: Uint8Array.from([0x89, 0x50, 0x4e, 0x47]),
  contentType: 'image/png',
};

function geminiResponse(menu: unknown): Response {
  return Response.json({
    candidates: [{ content: { parts: [{ text: JSON.stringify(menu) }] } }],
  });
}

describe('GeminiMenuExtractionGateway', () => {
  it('sends images as inline data and reads the structured response', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue(
      geminiResponse({ categories: [], style: {} }),
    );
    const gateway = new GeminiMenuExtractionGateway({
      apiKey: 'secret-key',
      fetchImplementation,
      maximumRetries: 2,
      model: 'gemini-2.5-flash',
      sleep: jest.fn(),
      timeoutMilliseconds: 10_000,
    });

    await expect(gateway.extract([PHOTO])).resolves.toEqual({
      categories: [],
      style: {},
    });
    const [, request] = fetchImplementation.mock.calls[0] as [string, RequestInit];
    if (typeof request.body !== 'string') throw new Error('Expected a JSON request body');
    const body = JSON.parse(request.body) as {
      contents: Array<{ parts: Array<{ inlineData?: { data: string } }> }>;
      generationConfig: { responseMimeType: string };
    };
    expect(request.headers).toMatchObject({ 'x-goog-api-key': 'secret-key' });
    expect(body.contents[0]?.parts[1]?.inlineData?.data).toBe('iVBORw==');
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('retries a transient 429 response with bounded backoff', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const fetchImplementation = jest
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(geminiResponse({ categories: ['ok'] }));
    const gateway = new GeminiMenuExtractionGateway({
      apiKey: 'secret-key',
      fetchImplementation,
      maximumRetries: 2,
      model: 'gemini-2.5-flash',
      random: (): number => 0,
      sleep,
      timeoutMilliseconds: 10_000,
    });

    await expect(gateway.extract([PHOTO])).resolves.toEqual({ categories: ['ok'] });
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(500);
  });

  it('does not retry a permanent authentication failure', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue(
      new Response('', { status: 401 }),
    );
    const gateway = new GeminiMenuExtractionGateway({
      apiKey: 'bad-key',
      fetchImplementation,
      maximumRetries: 2,
      model: 'gemini-2.5-flash',
      sleep: jest.fn(),
      timeoutMilliseconds: 10_000,
    });

    await expect(gateway.extract([PHOTO])).rejects.toMatchObject({
      kind: 'CONFIGURATION',
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });
});

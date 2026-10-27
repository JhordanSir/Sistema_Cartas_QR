/**
 * @jest-environment node
 */
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

import { apiInternalUrl, invalidOriginResponse, problemResponse, proxyApiStream } from './api-server';

describe('problemResponse', () => {
  it('sends the log message together with the code the client translates', async () => {
    const response = problemResponse(413, 'Product image is too large', {
      code: 'PRODUCT_IMAGE_INVALID',
      params: { maxMb: 4 },
    });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      code: 'PRODUCT_IMAGE_INVALID',
      message: 'Product image is too large',
      params: { maxMb: 4 },
    });
  });

  it('refuses a foreign origin with its own code', async () => {
    const response = invalidOriginResponse();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      code: 'INVALID_ORIGIN',
      message: 'Invalid request origin',
    });
  });
});

describe('apiInternalUrl', () => {
  const originalApiInternalUrl = process.env.API_INTERNAL_URL;

  afterEach(() => {
    if (originalApiInternalUrl === undefined) {
      delete process.env.API_INTERNAL_URL;
      return;
    }
    process.env.API_INTERNAL_URL = originalApiInternalUrl;
  });

  it('uses the private Compose alias when no runtime URL is configured', () => {
    delete process.env.API_INTERNAL_URL;

    expect(apiInternalUrl()).toBe('http://api-internal:3001');
  });

  it('keeps a configured development URL without its trailing slash', () => {
    process.env.API_INTERNAL_URL = 'http://127.0.0.1:3001/';

    expect(apiInternalUrl()).toBe('http://127.0.0.1:3001');
  });
});

describe('proxyApiStream', () => {
  it('hands the body on as it arrives, with headers that keep proxies from buffering', async () => {
    let push: (line: string) => void = () => undefined;
    let close: () => void = () => undefined;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        push = (line) => controller.enqueue(encoder.encode(line));
        close = () => controller.close();
      },
    });
    const upstream = new Response(body, {
      headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'set-cookie': 'leak=1' },
    });

    const response = await proxyApiStream(upstream);
    const reader = response.body!.getReader();
    push('{"position":1}\n');
    const first = await reader.read();

    // The first line is readable before the upstream has even finished.
    expect(new TextDecoder().decode(first.value)).toBe('{"position":1}\n');
    expect(Object.fromEntries(response.headers)).toEqual({
      'cache-control': 'no-store, no-transform',
      'content-type': 'application/x-ndjson; charset=utf-8',
      'x-accel-buffering': 'no',
    });
    close();
    await expect(reader.read()).resolves.toEqual({ done: true, value: undefined });
  });

  it('answers an API error as the usual small JSON document', async () => {
    const upstream = Response.json({ code: 'RESTAURANT_NOT_FOUND' }, { status: 404 });

    const response = await proxyApiStream(upstream);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ code: 'RESTAURANT_NOT_FOUND' });
  });
});

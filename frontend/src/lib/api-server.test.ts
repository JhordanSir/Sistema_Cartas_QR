/**
 * @jest-environment node
 */
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

import { apiInternalUrl, invalidOriginResponse, problemResponse } from './api-server';

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

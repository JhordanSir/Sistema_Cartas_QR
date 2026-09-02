jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

import { apiInternalUrl } from './api-server';

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

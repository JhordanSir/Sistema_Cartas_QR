/**
 * @jest-environment node
 */
import { POST } from './route';

const mockSet = jest.fn();

jest.mock('next/headers', () => ({
  cookies: async () => ({ set: mockSet }),
}));

function localeRequest(body: string, origin = 'http://localhost:3000'): Request {
  return new Request('http://localhost:3000/api/session/locale', {
    body,
    headers: { 'content-type': 'application/json', origin },
    method: 'POST',
  });
}

describe('POST /api/session/locale', () => {
  beforeEach(() => mockSet.mockReset());

  it('stores a supported language as a session cookie only the server reads', async () => {
    const response = await POST(localeRequest(JSON.stringify({ locale: 'en' })));

    expect(response.status).toBe(204);
    expect(mockSet).toHaveBeenCalledWith('sirio-locale', 'en', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: false,
    });
    const [, , options] = mockSet.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(options).not.toHaveProperty('maxAge');
    expect(options).not.toHaveProperty('expires');
  });

  it('refuses a request from another origin', async () => {
    const response = await POST(
      localeRequest(JSON.stringify({ locale: 'en' }), 'https://evil.example'),
    );

    expect(response.status).toBe(403);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it.each([
    ['an unsupported language', JSON.stringify({ locale: 'fr' })],
    ['a missing language', JSON.stringify({})],
    ['a body that is not JSON', 'locale=en'],
  ])('rejects %s', async (_label, body) => {
    const response = await POST(localeRequest(body));

    expect(response.status).toBe(400);
    expect(mockSet).not.toHaveBeenCalled();
  });
});

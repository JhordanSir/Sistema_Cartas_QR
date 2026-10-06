import { isAllowedOrigin, parseDigitizationSubscription, readCookie } from './realtime-protocol.js';

const RESTAURANT_ID = '11111111-1111-4111-8111-111111111111';
const PROGRESS_ID = '22222222-2222-4222-8222-222222222222';

describe('readCookie', () => {
  it('reads one cookie among several', () => {
    expect(readCookie('sirio_role=OWNER; sirio_access=abc.def; theme=dark', 'sirio_access')).toBe('abc.def');
  });

  it('does not confuse a cookie whose name merely contains the one asked for', () => {
    expect(readCookie('x_sirio_access=forged', 'sirio_access')).toBeNull();
  });

  it('returns null when the cookie is missing, empty or malformed', () => {
    expect(readCookie(undefined, 'sirio_access')).toBeNull();
    expect(readCookie('theme=dark', 'sirio_access')).toBeNull();
    expect(readCookie('sirio_access=', 'sirio_access')).toBeNull();
    expect(readCookie('sirio_access=%E0%A4%A', 'sirio_access')).toBeNull();
  });
});

describe('isAllowedOrigin', () => {
  const configured = ['http://localhost:3000'];

  it('accepts a configured origin', () => {
    expect(isAllowedOrigin({ origin: 'http://localhost:3000' }, configured)).toBe(true);
  });

  it('accepts the origin the browser addressed, as Next forwards it', () => {
    expect(
      isAllowedOrigin(
        {
          host: 'api-internal:3001',
          origin: 'https://cartas.example',
          'x-forwarded-host': 'cartas.example',
          'x-forwarded-proto': 'https, http',
        },
        configured,
      ),
    ).toBe(true);
  });

  it('rejects a page from another site and a handshake without Origin', () => {
    expect(
      isAllowedOrigin({ origin: 'https://evil.example', 'x-forwarded-host': 'cartas.example' }, configured),
    ).toBe(false);
    expect(isAllowedOrigin({ host: 'localhost:3000' }, configured)).toBe(false);
  });
});

describe('parseDigitizationSubscription', () => {
  it('accepts a digitization topic with two UUIDs', () => {
    expect(
      parseDigitizationSubscription({ progressId: PROGRESS_ID, restaurantId: RESTAURANT_ID, topic: 'digitization' }),
    ).toEqual({ progressId: PROGRESS_ID, restaurantId: RESTAURANT_ID, topic: 'digitization' });
  });

  it.each([
    null,
    'digitization',
    { progressId: PROGRESS_ID, restaurantId: RESTAURANT_ID, topic: 'statistics' },
    { progressId: 'p-1', restaurantId: RESTAURANT_ID, topic: 'digitization' },
    { progressId: PROGRESS_ID, restaurantId: 42, topic: 'digitization' },
  ])('rejects %p', (data) => {
    expect(parseDigitizationSubscription(data)).toBeNull();
  });
});

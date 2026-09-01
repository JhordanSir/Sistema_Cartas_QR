import { hashVisitorIp, normalizeVisitorIp } from './visitor-hash.js';

describe('visitor IP hashing', () => {
  it('normalizes proxy and IPv4-mapped IPv6 formats before hashing', () => {
    expect(normalizeVisitorIp('::ffff:203.0.113.8')).toBe('203.0.113.8');
    expect(normalizeVisitorIp('203.0.113.8, 10.0.0.2')).toBe('203.0.113.8');
    expect(hashVisitorIp('203.0.113.8', 'a-secret-that-is-long-enough-for-tests'))
      .toBe(hashVisitorIp('::ffff:203.0.113.8', 'a-secret-that-is-long-enough-for-tests'));
  });
});

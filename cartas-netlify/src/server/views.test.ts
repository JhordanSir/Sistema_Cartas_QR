import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { clientIp, visitorHash } from './views';

describe('visitante de la carta pública', () => {
  it('toma la IP de la cabecera de Netlify antes que la de X-Forwarded-For', () => {
    const headers = new Headers({ 'x-forwarded-for': '198.51.100.9', 'x-nf-client-connection-ip': '203.0.113.7' });

    expect(clientIp(headers)).toBe('203.0.113.7');
  });

  it('sin la cabecera de Netlify usa la primera dirección de X-Forwarded-For', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '198.51.100.9, 10.0.0.1' }))).toBe('198.51.100.9');
  });

  it('quita el prefijo ::ffff: de las IPv4 escritas como IPv6', () => {
    expect(clientIp(new Headers({ 'x-nf-client-connection-ip': '::ffff:203.0.113.7' }))).toBe('203.0.113.7');
    expect(clientIp(new Headers({ 'x-nf-client-connection-ip': '2001:DB8::1' }))).toBe('2001:db8::1');
  });

  it('sin cabeceras no hay IP', () => {
    expect(clientIp(new Headers())).toBeNull();
  });

  it('el hash es el HMAC-SHA256 de la IP con el secreto, en hexadecimal', () => {
    const secret = 'a'.repeat(64);

    const hash = visitorHash('203.0.113.7', secret);

    expect(hash).toBe(createHmac('sha256', secret).update('203.0.113.7').digest('hex'));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(visitorHash('203.0.113.8', secret)).not.toBe(hash);
    expect(visitorHash('203.0.113.7', 'b'.repeat(64))).not.toBe(hash);
  });
});

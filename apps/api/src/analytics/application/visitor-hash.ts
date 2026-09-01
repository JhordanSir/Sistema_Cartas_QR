import { createHmac } from 'node:crypto';

export function hashVisitorIp(visitorIp: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(normalizeVisitorIp(visitorIp))
    .digest('hex');
}

export function normalizeVisitorIp(visitorIp: string): string {
  const firstAddress = visitorIp.split(',')[0]?.trim() ?? '';
  if (firstAddress.startsWith('::ffff:')) {
    return firstAddress.slice('::ffff:'.length);
  }
  return firstAddress || 'unknown';
}

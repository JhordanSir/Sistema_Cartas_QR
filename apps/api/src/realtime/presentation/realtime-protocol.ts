import type { IncomingMessage } from 'node:http';

import type { DigitizationSubscription } from '@sirio/shared';
import { isUUID } from 'class-validator';

type HandshakeHeaders = IncomingMessage['headers'];

export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=');
    if (separator === -1 || pair.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(pair.slice(separator + 1).trim()) || null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Mirrors the BFF's isSameOrigin: the configured origins plus the one the browser
 * actually addressed, which Next forwards as x-forwarded-host. A page on another site
 * sends its own Origin, so it never matches.
 */
export function isAllowedOrigin(headers: HandshakeHeaders, configuredOrigins: readonly string[]): boolean {
  const origin = headers.origin;
  if (!origin) return false;
  const allowed = new Set(configuredOrigins);
  const host = firstValue(headers['x-forwarded-host']) ?? headers.host;
  const protocol = firstValue(headers['x-forwarded-proto']) ?? 'http';
  if (host) allowed.add(`${protocol}://${host}`);
  return allowed.has(origin);
}

export function parseDigitizationSubscription(data: unknown): DigitizationSubscription | null {
  if (typeof data !== 'object' || data === null) return null;
  const { progressId, restaurantId, topic } = data as Record<string, unknown>;
  if (topic !== 'digitization') return null;
  if (!isUUID(progressId, 4) || !isUUID(restaurantId, 4)) return null;
  return { progressId: progressId as string, restaurantId: restaurantId as string, topic };
}

function firstValue(header: string | string[] | undefined): string | undefined {
  const value = Array.isArray(header) ? header[0] : header;
  return value?.split(',')[0]?.trim() || undefined;
}

import type { Config } from '@netlify/functions';

import { describeErrorForLog } from '../../src/server/db-errors';
import { createFakeExtractor } from '../../src/server/digitization/fake-extractor';
import { runDigitizationJob } from '../../src/server/digitization/run';
import { isSameOrigin, requestHost } from '../../src/server/origin';
import { findRestaurantByOwner } from '../../src/server/restaurants';
import { readSession } from '../../src/server/session';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readJobId(request: Request): Promise<string | null> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null || !('jobId' in body)) return null;
    const { jobId } = body;
    return typeof jobId === 'string' && UUID_PATTERN.test(jobId) ? jobId.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Reads the photos of a job and replaces the draft with the extracted menu
 * (§E10). The owner's browser invokes it: while the site is private, a call
 * from the server to its own URL would not get through Netlify's protection.
 * It checks the Origin and the owner's session itself, and it never throws.
 */
export default async function digitizeBackground(request: Request): Promise<void> {
  try {
    if (request.method !== 'POST') return;
    const host = requestHost(request.headers) ?? new URL(request.url).host;
    if (!isSameOrigin(request.headers.get('origin'), host)) return;

    const session = await readSession(request.headers.get('cookie'));
    if (!session || session.account.role !== 'OWNER' || session.account.mustChangePassword) return;
    const restaurant = await findRestaurantByOwner(session.account.id);
    const jobId = await readJobId(request);
    if (!restaurant || !jobId) return;

    await runDigitizationJob({ extractor: createFakeExtractor(), jobId, restaurantId: restaurant.id });
  } catch (error) {
    console.error('digitize-background failed', describeErrorForLog(error));
  }
}

export const config: Config = { background: true };

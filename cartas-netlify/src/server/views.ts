import { createHmac } from 'node:crypto';

import { eq, lt, sql } from 'drizzle-orm';

import { getDb } from '../../db/index';
import { viewEvents, viewSummaries } from '../../db/schema';
import { addDays, toLimaDateTime } from '../shared/lima-time';
import { calculateViewStatistics, type ViewStatistics } from '../shared/view-statistics';

// Unique visits to the public menu (§E11). Only a keyed hash of the IP is
// stored, never the IP itself.

const SECRET_PATTERN = /^[0-9a-f]{64}$/i;
/** Events older than this many days are consolidated into view_summaries. */
const RETENTION_DAYS = 30;

/** Netlify's own header first, then the first X-Forwarded-For address, without `::ffff:`. */
export function clientIp(headers: Headers): string | null {
  const address =
    headers.get('x-nf-client-connection-ip')?.trim() || headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (!address) return null;
  const ip = address.toLowerCase();
  return ip.startsWith('::ffff:') ? ip.slice('::ffff:'.length) : ip;
}

/** HMAC-SHA256 of the IP with VIEW_HASH_SECRET, in hex. */
export function visitorHash(ip: string, secret: string): string {
  return createHmac('sha256', secret).update(ip).digest('hex');
}

/**
 * Counts a visit once per restaurant, Lima date and visitor, and only while
 * the restaurant is ENABLED. Without a valid secret nothing is recorded.
 */
export async function recordView(slug: string, headers: Headers, now = new Date()): Promise<void> {
  const secret = process.env.VIEW_HASH_SECRET?.trim();
  if (!secret || !SECRET_PATTERN.test(secret)) {
    console.error('VIEW_HASH_SECRET is missing or is not 64 hex characters: visits are not recorded.');
    return;
  }
  const { date, hour } = toLimaDateTime(now);
  const hash = visitorHash(clientIp(headers) ?? 'unknown', secret);
  await getDb().execute(sql`
    insert into view_events (restaurant_id, view_date, view_hour, visitor_hash)
    select id, ${date}::date, ${hour}::smallint, ${hash}::varchar from restaurants
     where slug = ${slug} and status = 'ENABLED'
    on conflict (restaurant_id, view_date, visitor_hash) do nothing`);
}

/** GET /api/estadisticas and /panel/estadisticas: the recent events plus the consolidated days. */
export async function getViewStatistics(restaurantId: string, now = new Date()): Promise<ViewStatistics> {
  const db = getDb();
  const events = await db
    .select({ date: viewEvents.viewDate, hour: viewEvents.viewHour, viewCount: sql<number>`count(*)::int` })
    .from(viewEvents)
    .where(eq(viewEvents.restaurantId, restaurantId))
    .groupBy(viewEvents.viewDate, viewEvents.viewHour);
  const summaries = await db
    .select({ date: viewSummaries.summaryDate, hour: viewSummaries.viewHour, viewCount: viewSummaries.viewCount })
    .from(viewSummaries)
    .where(eq(viewSummaries.restaurantId, restaurantId));
  return calculateViewStatistics([...events, ...summaries], toLimaDateTime(now).date);
}

/**
 * Retention (§E11): moves the events of up to `limit` restaurant-days older
 * than 30 days into view_summaries, summed by hour, and deletes them, in one
 * statement. Returns how many restaurant-days it moved.
 */
export async function consolidateOldViews({ limit = 50 }: { limit?: number } = {}, now = new Date()): Promise<number> {
  const cutoff = addDays(toLimaDateTime(now).date, -RETENTION_DAYS);
  const db = getDb();
  const days = await db
    .selectDistinct({ restaurantId: viewEvents.restaurantId, viewDate: viewEvents.viewDate })
    .from(viewEvents)
    .where(lt(viewEvents.viewDate, cutoff))
    .limit(limit);
  if (days.length === 0) return 0;

  const picked = sql.join(
    days.map(({ restaurantId, viewDate }) => sql`(${restaurantId}::uuid, ${viewDate}::date)`),
    sql`, `,
  );
  await db.execute(sql`
    with moved as (
      delete from view_events where (restaurant_id, view_date) in (${picked})
      returning restaurant_id, view_date, view_hour
    )
    insert into view_summaries (restaurant_id, summary_date, view_hour, view_count)
    select restaurant_id, view_date, view_hour, count(*)::int from moved group by 1, 2, 3
    on conflict (restaurant_id, summary_date, view_hour)
    do update set view_count = view_summaries.view_count + excluded.view_count`);
  return days.length;
}

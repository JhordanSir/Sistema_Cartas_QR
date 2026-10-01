// Lima keeps UTC−5 all year, without daylight saving time (§E11). Dates are
// "YYYY-MM-DD" strings, and the arithmetic runs in UTC so the server's own
// time zone never matters.

const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type LimaDateTime = { date: string; hour: number };

/** The date and hour (0–23) on a Lima clock at that instant. */
export function toLimaDateTime(instant: Date): LimaDateTime {
  const clock = new Date(instant.getTime() + LIMA_OFFSET_MS);
  return { date: clock.toISOString().slice(0, 10), hour: clock.getUTCHours() };
}

/** The date `days` after `date` (before it, if negative). */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Days from `first` to `last`, both included; 0 if `last` comes first. */
export function daysBetween(first: string, last: string): number {
  const days = Math.round((Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / DAY_MS) + 1;
  return Math.max(0, days);
}

/** How many times a weekday falls between two dates, both included. */
export function countWeekday(first: string, last: string, weekday: number): number {
  const days = daysBetween(first, last);
  const offset = (weekday - weekdayOf(first) + 7) % 7;
  return offset >= days ? 0 : Math.floor((days - 1 - offset) / 7) + 1;
}

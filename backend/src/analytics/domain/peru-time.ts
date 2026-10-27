export const PERU_TIME_ZONE = 'America/Lima';

const PERU_UTC_OFFSET_HOURS = -5;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;
const MILLISECONDS_PER_DAY =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export interface PeruDateTime {
  date: string;
  hour: number;
}

export function toPeruDateTime(instant: Date): PeruDateTime {
  const localClock = new Date(
    instant.getTime() + PERU_UTC_OFFSET_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
  );
  return {
    date: formatUtcDate(localClock),
    hour: localClock.getUTCHours(),
  };
}

export function addPeruCalendarDays(date: string, days: number): string {
  const calendarDay = new Date(`${date}T00:00:00.000Z`);
  calendarDay.setUTCDate(calendarDay.getUTCDate() + days);
  return formatUtcDate(calendarDay);
}

export function peruDateToStorageDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function storedDateToPeruDate(date: Date): string {
  return formatUtcDate(date);
}

export function comparePeruDates(left: string, right: string): number {
  return left.localeCompare(right);
}

export function peruWeekday(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

export function inclusivePeruCalendarDays(firstDate: string, lastDate: string): number {
  const difference =
    peruDateToStorageDate(lastDate).getTime() -
    peruDateToStorageDate(firstDate).getTime();
  return Math.floor(difference / MILLISECONDS_PER_DAY) + 1;
}

export function occurrencesOfPeruWeekday(
  firstDate: string,
  lastDate: string,
  weekday: number,
): number {
  const totalDays = inclusivePeruCalendarDays(firstDate, lastDate);
  const firstWeekday = peruWeekday(firstDate);
  const distanceToFirstOccurrence = (weekday - firstWeekday + 7) % 7;
  return distanceToFirstOccurrence >= totalDays
    ? 0
    : Math.floor((totalDays - 1 - distanceToFirstOccurrence) / 7) + 1;
}

export function nextPeruScheduledInstant(
  now: Date,
  hour: number,
  minute: number,
): Date {
  const localNow = toPeruDateTime(now);
  const todayRun = peruLocalDateTimeToInstant(localNow.date, hour, minute);
  return now.getTime() < todayRun.getTime()
    ? todayRun
    : peruLocalDateTimeToInstant(addPeruCalendarDays(localNow.date, 1), hour, minute);
}

function peruLocalDateTimeToInstant(date: string, hour: number, minute: number): Date {
  const [year = Number.NaN, month = Number.NaN, day = Number.NaN] = date
    .split('-')
    .map(Number);
  return new Date(
    Date.UTC(year, month - 1, day, hour - PERU_UTC_OFFSET_HOURS, minute),
  );
}

function formatUtcDate(date: Date): string {
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]
    .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, '0')))
    .join('-');
}

import { PERU_TIME_ZONE, addPeruCalendarDays, comparePeruDates, inclusivePeruCalendarDays, occurrencesOfPeruWeekday, peruWeekday } from './peru-time.js';

const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;

export interface ViewStatisticsBucket {
  date: string;
  hour: number;
  viewCount: number;
}

export interface ViewPeriodTotals {
  allTime: number;
  last30Days: number;
  last7Days: number;
}

export interface ViewHourStatistic {
  averageViews: number;
  hour: number;
  totalViews: number;
}

export interface ViewWeekdayStatistic {
  averageViews: number;
  dayOfWeek: number;
  totalViews: number;
}

export interface RestaurantViewStatistics {
  generatedForDate: string;
  hourly: ViewHourStatistic[];
  timeZone: typeof PERU_TIME_ZONE;
  uniqueViews: ViewPeriodTotals;
  weekdays: ViewWeekdayStatistic[];
}

export function calculateRestaurantViewStatistics(
  buckets: ViewStatisticsBucket[],
  currentDate: string,
): RestaurantViewStatistics {
  const normalizedBuckets = mergeBuckets(buckets);
  const firstDate = normalizedBuckets[0]?.date ?? currentDate;
  const spanDays = inclusivePeruCalendarDays(firstDate, currentDate);
  const last7DaysStart = addPeruCalendarDays(currentDate, -6);
  const last30DaysStart = addPeruCalendarDays(currentDate, -29);
  const hourlyTotals = Array<number>(HOURS_PER_DAY).fill(0);
  const weekdayTotals = Array<number>(DAYS_PER_WEEK).fill(0);
  let allTime = 0;
  let last7Days = 0;
  let last30Days = 0;

  for (const bucket of normalizedBuckets) {
    allTime += bucket.viewCount;
    hourlyTotals[bucket.hour]! += bucket.viewCount;
    weekdayTotals[peruWeekday(bucket.date)]! += bucket.viewCount;
    if (comparePeruDates(bucket.date, last7DaysStart) >= 0) {
      last7Days += bucket.viewCount;
    }
    if (comparePeruDates(bucket.date, last30DaysStart) >= 0) {
      last30Days += bucket.viewCount;
    }
  }

  return {
    generatedForDate: currentDate,
    hourly: hourlyTotals.map((totalViews, hour) => ({
      averageViews: roundAverage(totalViews, spanDays),
      hour,
      totalViews,
    })),
    timeZone: PERU_TIME_ZONE,
    uniqueViews: { allTime, last30Days, last7Days },
    weekdays: weekdayTotals.map((totalViews, dayOfWeek) => ({
      averageViews: roundAverage(
        totalViews,
        occurrencesOfPeruWeekday(firstDate, currentDate, dayOfWeek),
      ),
      dayOfWeek,
      totalViews,
    })),
  };
}

function mergeBuckets(buckets: ViewStatisticsBucket[]): ViewStatisticsBucket[] {
  const merged = new Map<string, ViewStatisticsBucket>();
  for (const bucket of buckets) {
    const key = `${bucket.date}:${bucket.hour}`;
    const current = merged.get(key);
    merged.set(key, {
      ...bucket,
      viewCount: (current?.viewCount ?? 0) + bucket.viewCount,
    });
  }
  return [...merged.values()].sort((left, right) =>
    left.date === right.date ? left.hour - right.hour : comparePeruDates(left.date, right.date),
  );
}

function roundAverage(total: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((total / denominator) * 100) / 100;
}

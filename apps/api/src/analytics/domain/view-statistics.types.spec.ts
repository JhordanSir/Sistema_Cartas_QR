import { calculateRestaurantViewStatistics } from './view-statistics.types.js';

describe('calculateRestaurantViewStatistics', () => {
  it('combines granular and retained views into Peru-local totals and averages', () => {
    const statistics = calculateRestaurantViewStatistics([
      { date: '2026-08-30', hour: 23, viewCount: 2 },
      { date: '2026-08-31', hour: 0, viewCount: 1 },
      { date: '2026-08-31', hour: 13, viewCount: 3 },
      { date: '2026-09-01', hour: 13, viewCount: 2 },
      { date: '2026-09-01', hour: 13, viewCount: 1 },
    ], '2026-09-01');

    expect(statistics.uniqueViews).toEqual({
      allTime: 9,
      last30Days: 9,
      last7Days: 9,
    });
    expect(statistics.hourly[13]).toEqual({
      averageViews: 2,
      hour: 13,
      totalViews: 6,
    });
    expect(statistics.hourly[23]).toEqual({
      averageViews: 0.67,
      hour: 23,
      totalViews: 2,
    });
    expect(statistics.weekdays[0]).toEqual({
      averageViews: 2,
      dayOfWeek: 0,
      totalViews: 2,
    });
    expect(statistics.weekdays[1]).toEqual({
      averageViews: 4,
      dayOfWeek: 1,
      totalViews: 4,
    });
  });

  it('keeps 7-day and 30-day windows inclusive of the current Peru date', () => {
    const statistics = calculateRestaurantViewStatistics([
      { date: '2026-08-02', hour: 12, viewCount: 4 },
      { date: '2026-08-03', hour: 12, viewCount: 2 },
      { date: '2026-08-26', hour: 12, viewCount: 3 },
      { date: '2026-08-27', hour: 12, viewCount: 5 },
    ], '2026-09-01');

    expect(statistics.uniqueViews).toEqual({
      allTime: 14,
      last30Days: 10,
      last7Days: 8,
    });
  });
});

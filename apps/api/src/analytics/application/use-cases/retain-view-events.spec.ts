import type { ViewStatisticsRepository } from '../ports/view-statistics.repository.js';
import { RetainViewEvents } from './retain-view-events.js';

describe('RetainViewEvents', () => {
  it('keeps the most recent 30 Peru calendar dates as detailed events', async () => {
    const repository: jest.Mocked<ViewStatisticsRepository> = {
      consolidateEventsBefore: jest.fn().mockResolvedValue(7),
      getBucketsForRestaurant: jest.fn(),
      recordUniquePublicView: jest.fn(),
    };
    const useCase = new RetainViewEvents(repository);

    await expect(useCase.execute(new Date('2026-09-01T05:00:00.000Z'))).resolves.toBe(7);

    expect(repository.consolidateEventsBefore)
      .toHaveBeenCalledWith(new Date('2026-08-03T00:00:00.000Z'));
  });
});

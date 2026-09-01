import type { ViewStatisticsRepository } from '../ports/view-statistics.repository.js';
import { RecordPublicView } from './record-public-view.js';

describe('RecordPublicView', () => {
  it('records a UTC instant under its Peru-local day and hour', async () => {
    const repository: jest.Mocked<ViewStatisticsRepository> = {
      consolidateEventsBefore: jest.fn(),
      getBucketsForRestaurant: jest.fn(),
      recordUniquePublicView: jest.fn().mockResolvedValue('recorded'),
    };
    const useCase = new RecordPublicView(
      repository,
      'a-secret-that-is-long-enough-for-tests',
    );

    await expect(useCase.execute({
      now: new Date('2026-09-01T05:20:00.000Z'),
      slug: 'mesa-norte',
      visitorIp: '203.0.113.12',
    })).resolves.toBe('recorded');

    expect(repository.recordUniquePublicView).toHaveBeenCalledWith(expect.objectContaining({
      slug: 'mesa-norte',
      viewDate: new Date('2026-09-01T00:00:00.000Z'),
      viewHour: 0,
      visitorHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
  });
});

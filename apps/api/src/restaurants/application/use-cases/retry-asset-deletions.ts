import type { RestaurantRepository } from '../ports/restaurant.repository.js';
import type { RestaurantAssetStorage } from '../ports/restaurant-services.js';

export class RetryAssetDeletions {
  constructor(
    private readonly repository: RestaurantRepository,
    private readonly storage: RestaurantAssetStorage,
  ) {}

  async execute(): Promise<{ completed: number; pending: number }> {
    const jobs = await this.repository.listPendingAssetDeletions();
    let completed = 0;

    for (const job of jobs) {
      try {
        await this.storage.deleteDirectory(job.relativePath);
        await this.repository.completeAssetDeletion(job.id);
        completed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown cleanup error';
        await this.repository.markAssetDeletionFailed(job.id, message);
      }
    }

    return { completed, pending: jobs.length - completed };
  }
}

import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';

import { RetryAssetDeletions } from '../application/use-cases/retry-asset-deletions.js';
import { RETRY_ASSET_DELETIONS } from '../restaurant.tokens.js';

@Injectable()
export class PendingAssetCleanupBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(PendingAssetCleanupBootstrap.name);

  constructor(
    @Inject(RETRY_ASSET_DELETIONS)
    private readonly retryAssetDeletions: RetryAssetDeletions,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const result = await this.retryAssetDeletions.execute();
    if (result.completed > 0 || result.pending > 0) {
      this.logger.log(
        `Asset cleanup completed=${result.completed} pending=${result.pending}`,
      );
    }
  }
}

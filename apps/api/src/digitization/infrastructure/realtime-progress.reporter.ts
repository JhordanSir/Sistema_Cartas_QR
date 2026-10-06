import { Logger } from '@nestjs/common';
import type { DigitizationProgress } from '@sirio/shared';

import { digitizationTopic, type SubscriptionHub } from '../../realtime/application/subscription-hub.js';
import type {
  DigitizationProgressReporter,
  DigitizationProgressScope,
} from '../application/ports/digitization-progress.reporter.js';

/** Publishes each stage to the sockets subscribed to this restaurant and progress id. */
export class RealtimeDigitizationProgressReporter implements DigitizationProgressReporter {
  private readonly logger = new Logger(RealtimeDigitizationProgressReporter.name);

  constructor(private readonly hub: SubscriptionHub) {}

  report(scope: DigitizationProgressScope, progress: DigitizationProgress): void {
    try {
      this.hub.publish(digitizationTopic(scope.restaurantId, scope.progressId), {
        data: { ...progress, progressId: scope.progressId },
        event: 'digitization.progress',
      });
    } catch (error) {
      this.logger.warn(`Digitization progress could not be published: ${String(error)}`);
    }
  }
}

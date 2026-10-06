import type { DigitizationProgress } from '@sirio/shared';

export interface DigitizationProgressScope {
  progressId: string;
  restaurantId: string;
}

/** Best effort: reporting must never fail or slow down the digitization itself. */
export interface DigitizationProgressReporter {
  report(scope: DigitizationProgressScope, progress: DigitizationProgress): void;
}

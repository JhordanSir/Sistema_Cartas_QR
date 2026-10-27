import { Logger } from '@nestjs/common';

import { digitizationTopic, SubscriptionHub } from '../../realtime/application/subscription-hub.js';
import { RealtimeDigitizationProgressReporter } from './realtime-progress.reporter.js';

const SCOPE = { progressId: 'progress-1', restaurantId: 'restaurant-1' };

describe('RealtimeDigitizationProgressReporter', () => {
  it('publishes the stage to the socket subscribed to that digitization', () => {
    const hub = new SubscriptionHub();
    const socket = { send: jest.fn() };
    const bystander = { send: jest.fn() };
    hub.subscribe(digitizationTopic(SCOPE.restaurantId, SCOPE.progressId), socket);
    hub.subscribe(digitizationTopic(SCOPE.restaurantId, 'progress-2'), bystander);

    new RealtimeDigitizationProgressReporter(hub).report(SCOPE, { stage: 'validating' });

    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        data: { stage: 'validating', progressId: 'progress-1' },
        event: 'digitization.progress',
      }),
    );
    expect(bystander.send).not.toHaveBeenCalled();
  });

  it('never lets a broken socket fail the digitization', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const hub = new SubscriptionHub();
    hub.subscribe(digitizationTopic(SCOPE.restaurantId, SCOPE.progressId), {
      send: () => {
        throw new Error('socket is gone');
      },
    });

    expect(() =>
      new RealtimeDigitizationProgressReporter(hub).report(SCOPE, { stage: 'saving' }),
    ).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

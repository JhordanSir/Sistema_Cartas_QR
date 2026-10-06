import type { RealtimeServerMessage } from '@sirio/shared';

import { digitizationTopic, type RealtimeSubscriber, SubscriptionHub } from './subscription-hub.js';

const MESSAGE: RealtimeServerMessage = { data: { progressId: 'p-1' }, event: 'subscribed' };

function subscriber(): RealtimeSubscriber & { send: jest.Mock } {
  return { send: jest.fn() };
}

describe('SubscriptionHub', () => {
  it('delivers a message only to the subscribers of its topic', () => {
    const hub = new SubscriptionHub();
    const listener = subscriber();
    const bystander = subscriber();
    hub.subscribe('digitization:a:1', listener);
    hub.subscribe('digitization:a:2', bystander);

    expect(hub.publish('digitization:a:1', MESSAGE)).toBe(1);
    expect(listener.send).toHaveBeenCalledWith(JSON.stringify(MESSAGE));
    expect(bystander.send).not.toHaveBeenCalled();
  });

  it('returns zero when nobody listens', () => {
    expect(new SubscriptionHub().publish('digitization:a:1', MESSAGE)).toBe(0);
  });

  it('counts a repeated subscription once', () => {
    const hub = new SubscriptionHub();
    const listener = subscriber();
    hub.subscribe('digitization:a:1', listener);
    hub.subscribe('digitization:a:1', listener);

    expect(hub.subscriptionCount(listener)).toBe(1);
    expect(hub.publish('digitization:a:1', MESSAGE)).toBe(1);
  });

  it('forgets every topic of a subscriber that leaves', () => {
    const hub = new SubscriptionHub();
    const listener = subscriber();
    const other = subscriber();
    hub.subscribe('digitization:a:1', listener);
    hub.subscribe('digitization:a:2', listener);
    hub.subscribe('digitization:a:2', other);

    hub.unsubscribeAll(listener);

    expect(hub.subscriptionCount(listener)).toBe(0);
    expect(hub.publish('digitization:a:1', MESSAGE)).toBe(0);
    expect(hub.publish('digitization:a:2', MESSAGE)).toBe(1);
    expect(listener.send).not.toHaveBeenCalled();
  });

  it('scopes a digitization topic by restaurant and progress id', () => {
    expect(digitizationTopic('r-1', 'p-1')).toBe('digitization:r-1:p-1');
    expect(digitizationTopic('r-1', 'p-1')).not.toBe(digitizationTopic('r-2', 'p-1'));
  });
});

import { EventEmitter } from 'node:events';
import type { IncomingMessage } from 'node:http';

import { REALTIME_CLOSE_CODES } from '@sirio/shared';
import type { WebSocket, WebSocketServer } from 'ws';

import type { AuthApplicationService } from '../../auth/application/auth.service.js';
import { AuthApplicationError } from '../../auth/domain/auth.errors.js';
import { AuthRole } from '../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../auth/domain/auth.types.js';
import { IS_PUBLIC_KEY } from '../../auth/presentation/auth.decorators.js';
import { digitizationTopic, SubscriptionHub } from '../application/subscription-hub.js';
import { HEARTBEAT_INTERVAL_MS, MAXIMUM_CONNECTION_AGE_MS, RealtimeGateway } from './realtime.gateway.js';

const ORIGIN = 'http://localhost:3000';
const RESTAURANT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_RESTAURANT_ID = '44444444-4444-4444-8444-444444444444';
const PROGRESS_ID = '22222222-2222-4222-8222-222222222222';
const OWNER: AuthPrincipal = {
  accountId: '33333333-3333-4333-8333-333333333333',
  email: 'owner@example.com',
  role: AuthRole.OWNER,
  sessionId: '55555555-5555-4555-8555-555555555555',
};

class FakeSocket extends EventEmitter {
  readonly close = jest.fn();
  readonly ping = jest.fn();
  readonly send = jest.fn();
  readonly terminate = jest.fn();
}

function handshake(headers: IncomingMessage['headers']): IncomingMessage {
  return { headers: { origin: ORIGIN, ...headers } } as IncomingMessage;
}

function setup(principal: AuthPrincipal | Error = OWNER): {
  auth: { authenticateAccessToken: jest.Mock; ownerCanAccessRestaurant: jest.Mock };
  gateway: RealtimeGateway;
  hub: SubscriptionHub;
} {
  const auth = {
    authenticateAccessToken: jest.fn(() =>
      principal instanceof Error ? Promise.reject(principal) : Promise.resolve(principal),
    ),
    ownerCanAccessRestaurant: jest.fn((_owner: AuthPrincipal, restaurantId: string) =>
      Promise.resolve(restaurantId === RESTAURANT_ID),
    ),
  };
  const hub = new SubscriptionHub();
  const gateway = new RealtimeGateway(auth as unknown as AuthApplicationService, hub, {
    allowedOrigins: [ORIGIN],
  });
  return { auth, gateway, hub };
}

async function connect(gateway: RealtimeGateway, cookie = 'sirio_access=token'): Promise<FakeSocket> {
  const socket = new FakeSocket();
  await gateway.handleConnection(socket as unknown as WebSocket, handshake({ cookie }));
  return socket;
}

function subscription(restaurantId = RESTAURANT_ID, progressId = PROGRESS_ID): object {
  return { progressId, restaurantId, topic: 'digitization' };
}

describe('RealtimeGateway', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('is public to the global HTTP guards, which cannot read a socket', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, RealtimeGateway)).toBe(true);
  });

  it('closes a handshake from another site before authenticating it', async () => {
    const { auth, gateway } = setup();
    const socket = new FakeSocket();

    await gateway.handleConnection(
      socket as unknown as WebSocket,
      handshake({ cookie: 'sirio_access=token', origin: 'https://evil.example' }),
    );

    expect(socket.close).toHaveBeenCalledWith(REALTIME_CLOSE_CODES.forbiddenOrigin, 'Origin not allowed');
    expect(auth.authenticateAccessToken).not.toHaveBeenCalled();
  });

  it('closes a handshake without the session cookie', async () => {
    const { auth, gateway } = setup();

    const socket = await connect(gateway, 'theme=dark');

    expect(socket.close).toHaveBeenCalledWith(REALTIME_CLOSE_CODES.sessionExpired, 'Session expired');
    expect(auth.authenticateAccessToken).not.toHaveBeenCalled();
  });

  it('closes a handshake whose token was rejected', async () => {
    const { gateway } = setup(new AuthApplicationError('INVALID_TOKEN', 'Invalid token'));

    const socket = await connect(gateway);

    expect(socket.close).toHaveBeenCalledWith(REALTIME_CLOSE_CODES.sessionExpired, 'Session expired');
  });

  it('closes a handshake from an administrator', async () => {
    const { gateway } = setup({ ...OWNER, role: AuthRole.ADMIN });

    const socket = await connect(gateway);

    expect(socket.close).toHaveBeenCalledWith(REALTIME_CLOSE_CODES.sessionExpired, 'Session expired');
  });

  it('subscribes an owner to the progress of their restaurant', async () => {
    const { auth, gateway, hub } = setup();
    const socket = await connect(gateway);

    await expect(gateway.subscribe(socket as unknown as WebSocket, subscription())).resolves.toEqual({
      data: { progressId: PROGRESS_ID },
      event: 'subscribed',
    });
    expect(auth.authenticateAccessToken).toHaveBeenCalledWith('token');
    expect(socket.close).not.toHaveBeenCalled();
    expect(hub.publish(digitizationTopic(RESTAURANT_ID, PROGRESS_ID), { data: { progressId: PROGRESS_ID }, event: 'subscribed' })).toBe(1);
  });

  it('waits for the handshake when the subscription arrives first', async () => {
    const { gateway } = setup();
    const socket = new FakeSocket();
    const connected = gateway.handleConnection(
      socket as unknown as WebSocket,
      handshake({ cookie: 'sirio_access=token' }),
    );

    const reply = gateway.subscribe(socket as unknown as WebSocket, subscription());

    await expect(reply).resolves.toMatchObject({ event: 'subscribed' });
    await connected;
  });

  it('refuses the restaurant of another owner', async () => {
    const { gateway, hub } = setup();
    const socket = await connect(gateway);

    await expect(
      gateway.subscribe(socket as unknown as WebSocket, subscription(OTHER_RESTAURANT_ID)),
    ).resolves.toEqual({ data: { code: 'ACCESS_DENIED' }, event: 'error' });
    expect(hub.subscriptionCount(socket as unknown as WebSocket)).toBe(0);
  });

  it('refuses a malformed subscription', async () => {
    const { auth, gateway } = setup();
    const socket = await connect(gateway);

    await expect(
      gateway.subscribe(socket as unknown as WebSocket, { restaurantId: RESTAURANT_ID, topic: 'digitization' }),
    ).resolves.toEqual({ data: { code: 'INVALID_MESSAGE' }, event: 'error' });
    expect(auth.ownerCanAccessRestaurant).not.toHaveBeenCalled();
  });

  it('refuses a subscription on a socket whose session was rejected', async () => {
    const { gateway } = setup(new AuthApplicationError('INVALID_TOKEN', 'Invalid token'));
    const socket = await connect(gateway);

    await expect(gateway.subscribe(socket as unknown as WebSocket, subscription())).resolves.toEqual({
      data: { code: 'SESSION_EXPIRED' },
      event: 'error',
    });
  });

  it('caps the subscriptions of one connection', async () => {
    const { gateway } = setup();
    const socket = await connect(gateway);
    const client = socket as unknown as WebSocket;
    for (const suffix of ['1', '2', '3', '4']) {
      await gateway.subscribe(client, subscription(RESTAURANT_ID, `22222222-2222-4222-8222-22222222222${suffix}`));
    }

    await expect(
      gateway.subscribe(client, subscription(RESTAURANT_ID, '22222222-2222-4222-8222-222222222225')),
    ).resolves.toEqual({ data: { code: 'TOO_MANY_SUBSCRIPTIONS' }, event: 'error' });
  });

  it('drops the subscriptions of a socket that disconnects', async () => {
    const { gateway, hub } = setup();
    const socket = await connect(gateway);
    await gateway.subscribe(socket as unknown as WebSocket, subscription());

    gateway.handleDisconnect(socket as unknown as WebSocket);

    expect(hub.subscriptionCount(socket as unknown as WebSocket)).toBe(0);
  });

  describe('heartbeat', () => {
    async function start(): Promise<{ gateway: RealtimeGateway; socket: FakeSocket }> {
      jest.useFakeTimers();
      const { gateway } = setup();
      const socket = await connect(gateway);
      gateway.afterInit({ clients: new Set([socket]) } as unknown as WebSocketServer);
      return { gateway, socket };
    }

    it('keeps answering sockets alive with pings', async () => {
      const { gateway, socket } = await start();

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      socket.emit('pong');
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);

      expect(socket.ping).toHaveBeenCalledTimes(2);
      expect(socket.terminate).not.toHaveBeenCalled();
      gateway.onModuleDestroy();
    });

    it('terminates a socket that missed a ping', async () => {
      const { gateway, socket } = await start();

      jest.advanceTimersByTime(2 * HEARTBEAT_INTERVAL_MS);

      expect(socket.terminate).toHaveBeenCalledTimes(1);
      gateway.onModuleDestroy();
    });

    it('closes a socket older than the maximum age', async () => {
      const { gateway, socket } = await start();
      socket.ping.mockImplementation(() => socket.emit('pong'));

      jest.advanceTimersByTime(MAXIMUM_CONNECTION_AGE_MS);

      expect(socket.close).toHaveBeenCalledWith(REALTIME_CLOSE_CODES.connectionExpired, 'Connection expired');
      expect(socket.terminate).not.toHaveBeenCalled();
      gateway.onModuleDestroy();
    });
  });
});

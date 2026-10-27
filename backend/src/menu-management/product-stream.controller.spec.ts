import { Logger, NotFoundException } from '@nestjs/common';

import { AuthRole } from '../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../auth/domain/auth.types.js';
import { RecordingResponse, asResponse } from '../testing/recording-response.js';
import type { StreamOwnedProducts } from './application/use-cases/product-stream.use-cases.js';
import { MenuManagementApplicationError } from './domain/menu-management.errors.js';
import type { ProductStreamItem } from './domain/menu-management.types.js';
import { ProductStreamController } from './product-stream.controller.js';

const RESTAURANT_ID = '33333333-3333-4333-8333-333333333333';
const principal: AuthPrincipal = {
  accountId: '44444444-4444-4444-8444-444444444444',
  email: 'owner@example.com',
  role: AuthRole.OWNER,
  sessionId: '55555555-5555-4555-8555-555555555555',
};

function controllerReturning(
  execute: () => Promise<AsyncGenerator<ProductStreamItem, void, undefined>>,
): ProductStreamController {
  return new ProductStreamController({ execute } as unknown as StreamOwnedProducts);
}

async function* items(...names: string[]): AsyncGenerator<ProductStreamItem, void, undefined> {
  let position = 0;
  for (const name of names) {
    position += 1;
    yield await Promise.resolve({
      basePrice: '10.00',
      category: { id: 'starters', name: 'Entradas' },
      description: null,
      extras: [],
      hasImage: false,
      id: name,
      isAvailable: true,
      name,
      position,
      updatedAt: '2026-10-26T12:00:00.000Z',
      variants: [],
    });
  }
}

describe('ProductStreamController', () => {
  let log: jest.SpyInstance;
  let logError: jest.SpyInstance;

  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('answers an ordinary 404 before writing anything when the restaurant is not the owner’s', async () => {
    const response = new RecordingResponse();
    const controller = controllerReturning(() =>
      Promise.reject(new MenuManagementApplicationError('RESTAURANT_NOT_FOUND', 'Restaurant not found.')),
    );

    await expect(
      controller.stream(principal, RESTAURANT_ID, { delayMs: 0 }, asResponse(response)),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(response.flushed).toBe(false);
    expect(response.chunks).toEqual([]);
  });

  it('streams the products and logs how many went out', async () => {
    const response = new RecordingResponse();

    await controllerReturning(() => Promise.resolve(items('Ceviche', 'Chicha'))).stream(
      principal,
      RESTAURANT_ID,
      { delayMs: 0 },
      asResponse(response),
    );

    expect(response.body.trim().split('\n').map((line) => (JSON.parse(line) as ProductStreamItem).name)).toEqual([
      'Ceviche',
      'Chicha',
    ]);
    expect(log).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`${RESTAURANT_ID}: 2 objects sent in \\d+ ms`)));
  });

  it('logs a failure after the headers instead of throwing into Nest', async () => {
    async function* failing(): AsyncGenerator<ProductStreamItem, void, undefined> {
      yield* items('Ceviche');
      throw new Error('database went away');
    }

    await expect(
      controllerReturning(() => Promise.resolve(failing())).stream(
        principal,
        RESTAURANT_ID,
        { delayMs: 0 },
        asResponse(new RecordingResponse()),
      ),
    ).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalledWith(`Product stream for ${RESTAURANT_ID} failed`, expect.any(String));
  });
});

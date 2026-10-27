import { AuthRole } from '../../../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import type { ProductStreamCursor, ProductStreamRow } from '../../domain/menu-management.types.js';
import type { ProductStreamRepository } from '../ports/menu-management.repositories.js';
import { StreamOwnedProducts } from './product-stream.use-cases.js';

const RESTAURANT_ID = '33333333-3333-4333-8333-333333333333';
const principal: AuthPrincipal = {
  accountId: '44444444-4444-4444-8444-444444444444',
  email: 'owner@example.com',
  role: AuthRole.OWNER,
  sessionId: '55555555-5555-4555-8555-555555555555',
};
const STARTERS = { id: 'starters', name: 'Entradas' };
const DRINKS = { id: 'drinks', name: 'Bebidas' };

function row(id: string, sortOrder: number): ProductStreamRow {
  return {
    basePrice: '12.50',
    description: null,
    extras: [],
    hasImage: false,
    id,
    isAvailable: true,
    name: `Producto ${id}`,
    sortOrder,
    updatedAt: '2026-10-26T12:00:00.000Z',
    variants: [],
  };
}

/** Serves each category's rows in keyset batches, like the Prisma adapter. */
function repositoryWith(rowsByCategory: Record<string, ProductStreamRow[]>): jest.Mocked<ProductStreamRepository> {
  return {
    findProductBatch: jest.fn((_restaurantId: string, categoryId: string, after: ProductStreamCursor | null, limit: number) => {
      const rows = rowsByCategory[categoryId] ?? [];
      const start = after ? rows.findIndex((candidate) => candidate.id === after.id) + 1 : 0;
      return Promise.resolve(rows.slice(start, start + limit));
    }),
    findStreamCategories: jest.fn().mockResolvedValue([STARTERS, DRINKS]),
  };
}

async function collect<T>(items: AsyncIterable<T>): Promise<T[]> {
  const collected: T[] = [];
  for await (const item of items) collected.push(item);
  return collected;
}

describe('StreamOwnedProducts', () => {
  it('yields every product in menu order, numbered, reading each category in batches', async () => {
    const repository = repositoryWith({
      drinks: [row('d1', 0)],
      starters: [row('s1', 0), row('s2', 1), row('s3', 2)],
    });

    const items = await collect(
      await new StreamOwnedProducts(repository, 2).execute({ principal, restaurantId: RESTAURANT_ID }),
    );

    expect(items.map(({ category, id, position }) => [position, category.name, id])).toEqual([
      [1, 'Entradas', 's1'],
      [2, 'Entradas', 's2'],
      [3, 'Entradas', 's3'],
      [4, 'Bebidas', 'd1'],
    ]);
    expect(repository.findStreamCategories).toHaveBeenCalledWith(principal.accountId, RESTAURANT_ID);
    expect(repository.findProductBatch.mock.calls).toEqual([
      [RESTAURANT_ID, 'starters', null, 2],
      [RESTAURANT_ID, 'starters', { id: 's2', sortOrder: 1 }, 2],
      [RESTAURANT_ID, 'drinks', null, 2],
    ]);
  });

  it('asks once more when a batch comes back full, and stops on the empty one', async () => {
    const repository = repositoryWith({ starters: [row('s1', 0), row('s2', 1)] });

    await collect(await new StreamOwnedProducts(repository, 2).execute({ principal, restaurantId: RESTAURANT_ID }));

    expect(repository.findProductBatch.mock.calls.slice(0, 2)).toEqual([
      [RESTAURANT_ID, 'starters', null, 2],
      [RESTAURANT_ID, 'starters', { id: 's2', sortOrder: 1 }, 2],
    ]);
  });

  it('sends the wire shape without the internal sort key', async () => {
    const repository = repositoryWith({ starters: [row('s1', 7)] });

    const [item] = await collect(
      await new StreamOwnedProducts(repository).execute({ principal, restaurantId: RESTAURANT_ID }),
    );

    expect(item).toEqual({
      basePrice: '12.50',
      category: STARTERS,
      description: null,
      extras: [],
      hasImage: false,
      id: 's1',
      isAvailable: true,
      name: 'Producto s1',
      position: 1,
      updatedAt: '2026-10-26T12:00:00.000Z',
      variants: [],
    });
  });

  it('reads nothing ahead of the consumer and stops reading when it stops', async () => {
    const repository = repositoryWith({
      drinks: [row('d1', 0)],
      starters: [row('s1', 0), row('s2', 1), row('s3', 2)],
    });
    const products = await new StreamOwnedProducts(repository, 1).execute({
      principal,
      restaurantId: RESTAURANT_ID,
    });

    expect(repository.findProductBatch).not.toHaveBeenCalled();
    await products.next();
    expect(repository.findProductBatch).toHaveBeenCalledTimes(1);
    await products.return(undefined);

    await expect(products.next()).resolves.toEqual({ done: true, value: undefined });
    expect(repository.findProductBatch).toHaveBeenCalledTimes(1);
  });

  it('refuses before streaming when the restaurant is not the owner’s', async () => {
    const repository = repositoryWith({});
    repository.findStreamCategories.mockResolvedValue(null);

    await expect(
      new StreamOwnedProducts(repository).execute({ principal, restaurantId: RESTAURANT_ID }),
    ).rejects.toMatchObject({ code: 'RESTAURANT_NOT_FOUND' });
    expect(repository.findProductBatch).not.toHaveBeenCalled();
  });

  it('only serves owners', async () => {
    const repository = repositoryWith({});

    await expect(
      new StreamOwnedProducts(repository).execute({
        principal: { ...principal, role: AuthRole.ADMIN },
        restaurantId: RESTAURANT_ID,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(repository.findStreamCategories).not.toHaveBeenCalled();
  });
});

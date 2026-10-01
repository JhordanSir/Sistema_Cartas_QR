import { and, asc, eq, sql } from 'drizzle-orm';

import { getDb, type Transaction } from '../../db/index';
import { categories, products } from '../../db/schema';
import {
  moveItem,
  sortOrders,
  type CategoryLayout,
  type DraftCategory,
  type MenuDraft,
  type MoveDirection,
} from '../shared/menu';
import { deleteBlobQuietly, mediaUrl } from './blobs';
import { ApiError } from './http';
import { hasActiveDigitization, withMenuEdit } from './menu-lock';

// The menu draft (§E7): categories and products of one restaurant. Every query
// filters by the restaurant of the session, so another tenant's id is a 404.

const SECTION_NOT_FOUND = 'No encontramos esa sección.';
const PRODUCT_NOT_FOUND = 'No encontramos ese producto.';

function sectionNotFound(): ApiError {
  return new ApiError(404, 'NOT_FOUND', SECTION_NOT_FOUND);
}

function productNotFound(): ApiError {
  return new ApiError(404, 'NOT_FOUND', PRODUCT_NOT_FOUND);
}

export async function getMenuDraft(restaurantId: string): Promise<MenuDraft> {
  const db = getDb();
  const categoryRows = await db
    .select({ id: categories.id, layout: categories.layout, name: categories.name })
    .from(categories)
    .where(eq(categories.restaurantId, restaurantId))
    .orderBy(asc(categories.sortOrder), asc(categories.createdAt));
  const productRows = await db
    .select({
      basePrice: products.basePrice,
      categoryId: products.categoryId,
      description: products.description,
      id: products.id,
      imageKey: products.imageKey,
      isAvailable: products.isAvailable,
      name: products.name,
    })
    .from(products)
    .where(eq(products.restaurantId, restaurantId))
    .orderBy(asc(products.sortOrder), asc(products.createdAt));

  const byCategory = new Map<string, DraftCategory>(
    categoryRows.map((category) => [category.id, { ...category, products: [] }]),
  );
  for (const { categoryId, imageKey, ...product } of productRows) {
    byCategory.get(categoryId)?.products.push({
      ...product,
      imageUrl: imageKey ? mediaUrl(imageKey) : null,
    });
  }
  return {
    categories: [...byCategory.values()],
    digitizationInProgress: await hasActiveDigitization(restaurantId),
  };
}

async function nextCategoryOrder(tx: Transaction, restaurantId: string): Promise<number> {
  const [row] = await tx
    .select({ next: sql<number>`coalesce(max(${categories.sortOrder}) + 1, 0)::int` })
    .from(categories)
    .where(eq(categories.restaurantId, restaurantId));
  return row?.next ?? 0;
}

async function nextProductOrder(tx: Transaction, restaurantId: string, categoryId: string): Promise<number> {
  const [row] = await tx
    .select({ next: sql<number>`coalesce(max(${products.sortOrder}) + 1, 0)::int` })
    .from(products)
    .where(and(eq(products.restaurantId, restaurantId), eq(products.categoryId, categoryId)));
  return row?.next ?? 0;
}

async function assertOwnSection(tx: Transaction, restaurantId: string, sectionId: string): Promise<void> {
  const [section] = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, sectionId), eq(categories.restaurantId, restaurantId)))
    .limit(1);
  if (!section) throw sectionNotFound();
}

type Ordered = { id: string; sortOrder: number };

/**
 * Writes 0, 1, 2… in the new order. A row is skipped only when its stored value
 * already is its new position: after deletions the stored values can have gaps.
 */
async function applyOrder(
  tx: Transaction,
  table: typeof categories | typeof products,
  restaurantId: string,
  reordered: readonly Ordered[],
): Promise<void> {
  const stored = new Map(reordered.map(({ id, sortOrder }) => [id, sortOrder]));
  for (const { id, sortOrder } of sortOrders(reordered)) {
    if (stored.get(id) === sortOrder) continue;
    await tx
      .update(table)
      .set({ sortOrder })
      .where(and(eq(table.id, id), eq(table.restaurantId, restaurantId)));
  }
}

export type SectionInput = { name: string; layout: CategoryLayout };

export async function createSection(restaurantId: string, input: SectionInput): Promise<void> {
  await withMenuEdit(restaurantId, async (tx) => {
    const sortOrder = await nextCategoryOrder(tx, restaurantId);
    await tx.insert(categories).values({ ...input, restaurantId, sortOrder });
  });
}

export async function updateSection(
  restaurantId: string,
  sectionId: string,
  input: Partial<SectionInput>,
): Promise<void> {
  await withMenuEdit(restaurantId, async (tx) => {
    const [updated] = await tx
      .update(categories)
      .set(input)
      .where(and(eq(categories.id, sectionId), eq(categories.restaurantId, restaurantId)))
      .returning({ id: categories.id });
    if (!updated) throw sectionNotFound();
  });
}

/** Deletes the section and, by cascade, its products; then their images (§E6). */
export async function deleteSection(restaurantId: string, sectionId: string): Promise<void> {
  const imageKeys = await withMenuEdit(restaurantId, async (tx) => {
    const images = await tx
      .select({ imageKey: products.imageKey })
      .from(products)
      .where(and(eq(products.categoryId, sectionId), eq(products.restaurantId, restaurantId)));
    const [deleted] = await tx
      .delete(categories)
      .where(and(eq(categories.id, sectionId), eq(categories.restaurantId, restaurantId)))
      .returning({ id: categories.id });
    if (!deleted) throw sectionNotFound();
    return images.map(({ imageKey }) => imageKey).filter((key): key is string => key !== null);
  });
  await Promise.all(imageKeys.map(deleteBlobQuietly));
}

export async function moveSection(
  restaurantId: string,
  sectionId: string,
  direction: MoveDirection,
): Promise<void> {
  await withMenuEdit(restaurantId, async (tx) => {
    const siblings = await tx
      .select({ id: categories.id, sortOrder: categories.sortOrder })
      .from(categories)
      .where(eq(categories.restaurantId, restaurantId))
      .orderBy(asc(categories.sortOrder), asc(categories.createdAt));
    if (!siblings.some(({ id }) => id === sectionId)) throw sectionNotFound();
    const reordered = moveItem(siblings, sectionId, direction);
    if (reordered) await applyOrder(tx, categories, restaurantId, reordered);
  });
}

export type ProductInput = {
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: string;
  isAvailable: boolean;
};

export async function createProduct(restaurantId: string, input: ProductInput): Promise<void> {
  await withMenuEdit(restaurantId, async (tx) => {
    await assertOwnSection(tx, restaurantId, input.categoryId);
    const sortOrder = await nextProductOrder(tx, restaurantId, input.categoryId);
    await tx.insert(products).values({ ...input, restaurantId, sortOrder });
  });
}

/** Edits the product; a different section moves it to the end of that section. */
export async function updateProduct(
  restaurantId: string,
  productId: string,
  input: ProductInput,
): Promise<void> {
  await withMenuEdit(restaurantId, async (tx) => {
    const [current] = await tx
      .select({ categoryId: products.categoryId })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.restaurantId, restaurantId)))
      .limit(1);
    if (!current) throw productNotFound();

    let sortOrder: number | undefined;
    if (input.categoryId !== current.categoryId) {
      await assertOwnSection(tx, restaurantId, input.categoryId);
      sortOrder = await nextProductOrder(tx, restaurantId, input.categoryId);
    }
    await tx
      .update(products)
      .set({ ...input, ...(sortOrder === undefined ? {} : { sortOrder }) })
      .where(and(eq(products.id, productId), eq(products.restaurantId, restaurantId)));
  });
}

export async function deleteProduct(restaurantId: string, productId: string): Promise<void> {
  const imageKey = await withMenuEdit(restaurantId, async (tx) => {
    const [deleted] = await tx
      .delete(products)
      .where(and(eq(products.id, productId), eq(products.restaurantId, restaurantId)))
      .returning({ imageKey: products.imageKey });
    if (!deleted) throw productNotFound();
    return deleted.imageKey;
  });
  if (imageKey) await deleteBlobQuietly(imageKey);
}

export async function moveProduct(
  restaurantId: string,
  productId: string,
  direction: MoveDirection,
): Promise<void> {
  await withMenuEdit(restaurantId, async (tx) => {
    const [product] = await tx
      .select({ categoryId: products.categoryId })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.restaurantId, restaurantId)))
      .limit(1);
    if (!product) throw productNotFound();
    const siblings = await tx
      .select({ id: products.id, sortOrder: products.sortOrder })
      .from(products)
      .where(and(eq(products.restaurantId, restaurantId), eq(products.categoryId, product.categoryId)))
      .orderBy(asc(products.sortOrder), asc(products.createdAt));
    const reordered = moveItem(siblings, productId, direction);
    if (reordered) await applyOrder(tx, products, restaurantId, reordered);
  });
}

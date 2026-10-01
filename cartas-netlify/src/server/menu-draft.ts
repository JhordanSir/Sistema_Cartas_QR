import { and, asc, eq, sql } from 'drizzle-orm';

import { getDb, type Executor, type Transaction } from '../../db/index';
import { categories, productExtras, products, productVariants, restaurants } from '../../db/schema';
import {
  moveItem,
  sortOrders,
  type CategoryLayout,
  type MenuDraft,
  type MoveDirection,
  type PricedItem,
  type PricedItemValues,
} from '../shared/menu';
import {
  hasAvailableProduct,
  hasUnpublishedChanges,
  parseMenuSnapshot,
  type MenuSnapshot,
  type SnapshotCategory,
} from '../shared/menu-snapshot';
import { detectedMenuStyle, resolveMenuStyle, type MenuTemplate } from '../shared/menu-style';
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

/** The draft as a snapshot (§E7): the same shape that gets published. */
async function loadDraftSnapshot(
  executor: Executor,
  restaurantId: string,
): Promise<{
  snapshot: MenuSnapshot;
  restaurant: {
    slug: string;
    publishedMenu: unknown;
    publishedAt: Date | null;
    menuTemplate: MenuTemplate;
    sourceStyle: unknown;
  };
}> {
  const [restaurant] = await executor
    .select({
      menuTemplate: restaurants.menuTemplate,
      publishedAt: restaurants.publishedAt,
      publishedMenu: restaurants.publishedMenu,
      slug: restaurants.slug,
      sourceStyle: restaurants.sourceStyle,
    })
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId))
    .limit(1);
  if (!restaurant) throw new Error(`Restaurant ${restaurantId} does not exist.`);

  const categoryRows = await executor
    .select({ id: categories.id, layout: categories.layout, name: categories.name })
    .from(categories)
    .where(eq(categories.restaurantId, restaurantId))
    .orderBy(asc(categories.sortOrder), asc(categories.createdAt));
  const productRows = await executor
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
  const variants = await pricedItemsByProduct(executor, productVariants, restaurantId);
  const extras = await pricedItemsByProduct(executor, productExtras, restaurantId);

  const byCategory = new Map<string, SnapshotCategory>(
    categoryRows.map((category) => [category.id, { ...category, products: [] }]),
  );
  for (const { categoryId, ...product } of productRows) {
    byCategory.get(categoryId)?.products.push({
      ...product,
      extras: extras.get(product.id) ?? [],
      variants: variants.get(product.id) ?? [],
    });
  }
  return {
    restaurant,
    snapshot: {
      categories: [...byCategory.values()],
      style: resolveMenuStyle(restaurant.menuTemplate, restaurant.sourceStyle),
      template: restaurant.menuTemplate,
    },
  };
}

export async function getMenuDraft(restaurantId: string): Promise<MenuDraft> {
  const { restaurant, snapshot } = await loadDraftSnapshot(getDb(), restaurantId);
  return {
    appearance: {
      detectedStyle: detectedMenuStyle(restaurant.sourceStyle),
      template: restaurant.menuTemplate,
    },
    categories: snapshot.categories.map((category) => ({
      ...category,
      products: category.products.map(({ imageKey, ...product }) => ({
        ...product,
        imageUrl: imageKey ? mediaUrl(imageKey) : null,
      })),
    })),
    digitizationInProgress: await hasActiveDigitization(restaurantId),
    publication: {
      hasUnpublishedChanges: hasUnpublishedChanges(snapshot, parseMenuSnapshot(restaurant.publishedMenu)),
      publishedAt: restaurant.publishedAt?.toISOString() ?? null,
      slug: restaurant.slug,
    },
  };
}

/**
 * Chooses the template (§E7). It is part of the snapshot, so the change shows
 * up as «Tienes cambios por publicar» and reaches diners only when published.
 */
export async function setMenuTemplate(restaurantId: string, template: MenuTemplate): Promise<void> {
  await withMenuEdit(restaurantId, async (tx) => {
    await tx.update(restaurants).set({ menuTemplate: template }).where(eq(restaurants.id, restaurantId));
  });
}

export const EMPTY_MENU_MESSAGE = 'Agrega al menos un producto disponible antes de publicar.';

/**
 * Publishes the draft (§E7): its snapshot replaces `published_menu` in a
 * single UPDATE. Returns the slug, so the caller can invalidate `menu:{slug}`.
 */
export async function publishMenu(restaurantId: string): Promise<string> {
  return withMenuEdit(restaurantId, async (tx) => {
    const { restaurant, snapshot } = await loadDraftSnapshot(tx, restaurantId);
    if (!hasAvailableProduct(snapshot)) throw new ApiError(400, 'EMPTY_MENU', EMPTY_MENU_MESSAGE);
    await tx
      .update(restaurants)
      .set({ publishedAt: new Date(), publishedMenu: snapshot })
      .where(eq(restaurants.id, restaurantId));
    return restaurant.slug;
  });
}

async function pricedItemsByProduct(
  executor: Executor,
  table: typeof productVariants | typeof productExtras,
  restaurantId: string,
): Promise<Map<string, PricedItem[]>> {
  const rows = await executor
    .select({ id: table.id, name: table.name, price: table.price, productId: table.productId })
    .from(table)
    .where(eq(table.restaurantId, restaurantId))
    .orderBy(asc(table.sortOrder));
  const byProduct = new Map<string, PricedItem[]>();
  for (const { productId, ...item } of rows) {
    const list = byProduct.get(productId) ?? [];
    list.push(item);
    byProduct.set(productId, list);
  }
  return byProduct;
}

/** Replaces both lists of a product inside the transaction of the edit. */
async function replacePricedItems(
  tx: Transaction,
  restaurantId: string,
  productId: string,
  input: { variants: readonly PricedItemValues[]; extras: readonly PricedItemValues[] },
): Promise<void> {
  for (const [table, items] of [
    [productVariants, input.variants],
    [productExtras, input.extras],
  ] as const) {
    await tx
      .delete(table)
      .where(and(eq(table.productId, productId), eq(table.restaurantId, restaurantId)));
    if (items.length > 0) {
      await tx
        .insert(table)
        .values(items.map((item, sortOrder) => ({ ...item, productId, restaurantId, sortOrder })));
    }
  }
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
  variants: PricedItemValues[];
  extras: PricedItemValues[];
};

/** Creates the product at the end of its section and returns its id. */
export async function createProduct(restaurantId: string, input: ProductInput): Promise<string> {
  return withMenuEdit(restaurantId, async (tx) => {
    const { extras, variants, ...fields } = input;
    await assertOwnSection(tx, restaurantId, fields.categoryId);
    const sortOrder = await nextProductOrder(tx, restaurantId, fields.categoryId);
    const [created] = await tx
      .insert(products)
      .values({ ...fields, restaurantId, sortOrder })
      .returning({ id: products.id });
    if (!created) throw new Error('The product insert returned no row.');
    await replacePricedItems(tx, restaurantId, created.id, { extras, variants });
    return created.id;
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

    const { extras, variants, ...fields } = input;
    let sortOrder: number | undefined;
    if (fields.categoryId !== current.categoryId) {
      await assertOwnSection(tx, restaurantId, fields.categoryId);
      sortOrder = await nextProductOrder(tx, restaurantId, fields.categoryId);
    }
    // The composite foreign keys of the lists point at (id, restaurant_id), so
    // moving the product to another section of the same restaurant keeps them valid.
    await tx
      .update(products)
      .set({ ...fields, ...(sortOrder === undefined ? {} : { sortOrder }) })
      .where(and(eq(products.id, productId), eq(products.restaurantId, restaurantId)));
    await replacePricedItems(tx, restaurantId, productId, { extras, variants });
  });
}

/**
 * Points the product at a new image (or none) and returns the previous key,
 * which the caller deletes once this change is committed (§E6).
 */
export async function setProductImage(
  restaurantId: string,
  productId: string,
  imageKey: string | null,
): Promise<string | null> {
  return withMenuEdit(restaurantId, async (tx) => {
    const [current] = await tx
      .select({ imageKey: products.imageKey })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.restaurantId, restaurantId)))
      .limit(1);
    if (!current) throw productNotFound();
    await tx
      .update(products)
      .set({ imageKey })
      .where(and(eq(products.id, productId), eq(products.restaurantId, restaurantId)));
    return current.imageKey;
  });
}

/** 404 unless the product belongs to the restaurant; checked before uploading anything. */
export async function assertOwnProduct(restaurantId: string, productId: string): Promise<void> {
  const [product] = await getDb()
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.restaurantId, restaurantId)))
    .limit(1);
  if (!product) throw productNotFound();
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

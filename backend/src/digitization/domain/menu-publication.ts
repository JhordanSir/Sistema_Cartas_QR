import type { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

import {
  CATEGORY_LAYOUTS,
  DEFAULT_CATEGORY_LAYOUT,
  type CategoryLayout,
  type ExtractedMenu,
  type MenuStyle,
  type PublishedMenu,
} from './menu.types.js';

export const MENU_TEMPLATE_IDS = ['ORIGINAL', 'TRADITIONAL', 'CASUAL', 'PREMIUM'] as const;

export type MenuTemplateId = (typeof MENU_TEMPLATE_IDS)[number];

const MENU_TEMPLATE_DETAILS: Record<MenuTemplateId, {
  description: string;
  label: string;
  style: MenuStyle | null;
}> = {
  ORIGINAL: {
    description: 'Conserva los colores y la tipografía detectados en tu carta.',
    label: 'Original detectado',
    style: null,
  },
  TRADITIONAL: {
    description: 'Papel marfil y serif clásica para una carta de mesa.',
    label: 'Tradicional',
    style: { backgroundColor: '#FFF8ED', fontFamily: 'Libre Baskerville', textColor: '#3D2A20' },
  },
  CASUAL: {
    description: 'Claro, cercano y fácil de leer desde el celular.',
    label: 'Casual',
    style: { backgroundColor: '#F1F7F0', fontFamily: 'Nunito', textColor: '#20382D' },
  },
  PREMIUM: {
    description: 'Tinta oscura y detalles cálidos para una propuesta más sobria.',
    label: 'Premium',
    style: { backgroundColor: '#1D1815', fontFamily: 'Playfair Display', textColor: '#FFF3DD' },
  },
};

export const menuInclude = {
  categories: {
    include: {
      products: {
        include: {
          extras: { orderBy: { sortOrder: 'asc' as const } },
          variants: { orderBy: { sortOrder: 'asc' as const } },
        },
        orderBy: { sortOrder: 'asc' as const },
      },
    },
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;

type MenuRecord = {
  backgroundColor: string;
  categories: Array<{
    id: string;
    layout: string;
    name: string;
    products: Array<{
      basePrice: { toFixed(digits: number): string };
      description: string | null;
      extras: Array<{ id: string; name: string; price: { toFixed(digits: number): string } }>;
      id: string;
      imagePath: string | null;
      isAvailable: boolean;
      name: string;
      variants: Array<{ id: string; name: string; price: { toFixed(digits: number): string } }>;
    }>;
  }>;
  fontFamily: string;
  textColor: string;
};

type OwnedMenuRecord = MenuRecord & {
  id: string;
  menuTemplate: string;
  publishedAt: Date | null;
  publishedMenu: Prisma.JsonValue | null;
  publicationInitialized: boolean;
  updatedAt: Date;
};

export function toMenuSnapshot(record: MenuRecord): ExtractedMenu {
  return {
    categories: record.categories.map((category) => ({
      id: category.id,
      layout: normalizeCategoryLayout(category.layout),
      name: category.name,
      products: category.products.map((product) => ({
        basePrice: product.basePrice.toFixed(2),
        description: product.description,
        extras: product.extras.map((extra) => ({
          id: extra.id,
          name: extra.name,
          price: extra.price.toFixed(2),
        })),
        id: product.id,
        imagePath: product.imagePath,
        isAvailable: product.isAvailable,
        name: product.name,
        variants: product.variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          price: variant.price.toFixed(2),
        })),
      })),
    })),
    style: {
      backgroundColor: record.backgroundColor,
      fontFamily: record.fontFamily as MenuStyle['fontFamily'],
      textColor: record.textColor,
    },
  };
}

export function toOwnedMenu(record: OwnedMenuRecord): PublishedMenu {
  const snapshot = toMenuSnapshot(record);
  const publishedSnapshot = parseMenuSnapshot(record.publishedMenu);
  const legacyMenuIsLive =
    !record.publicationInitialized
    && publishedSnapshot === null
    && hasPublishableProducts(snapshot);
  return {
    ...snapshot,
    publication: {
      hasPublishedMenu: publishedSnapshot !== null || legacyMenuIsLive,
      hasUnpublishedChanges:
        publishedSnapshot === null
          ? record.publicationInitialized && hasPublishableProducts(snapshot)
          : !sameMenuSnapshot(publishedSnapshot, snapshot),
      publishedAt: record.publishedAt?.toISOString() ?? null,
    },
    restaurantId: record.id,
    template: normalizeMenuTemplate(record.menuTemplate),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function parseMenuSnapshot(value: Prisma.JsonValue | null): ExtractedMenu | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const snapshot = value as Partial<ExtractedMenu>;
  if (!Array.isArray(snapshot.categories) || !isMenuStyle(snapshot.style)) return null;
  return {
    ...(snapshot as ExtractedMenu),
    // Menus published before sections had a layout carry no such field. Filling it
    // with the default keeps them comparable, so nobody sees a phantom
    // "tienes cambios por publicar" the day this ships.
    categories: snapshot.categories.map((category) => ({
      ...category,
      layout: normalizeCategoryLayout((category as { layout?: unknown }).layout),
    })),
  };
}

function normalizeCategoryLayout(value: unknown): CategoryLayout {
  return CATEGORY_LAYOUTS.includes(value as CategoryLayout)
    ? (value as CategoryLayout)
    : DEFAULT_CATEGORY_LAYOUT;
}

export function parseStoredMenuStyle(value: Prisma.JsonValue | null): MenuStyle | null {
  return isMenuStyle(value) ? value : null;
}

function sameMenuSnapshot(left: ExtractedMenu, right: ExtractedMenu): boolean {
  return JSON.stringify(sortSnapshotFields(left)) === JSON.stringify(sortSnapshotFields(right));
}

function sortSnapshotFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortSnapshotFields);
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, sortSnapshotFields(record[key])]),
  );
}

export function hasPublishableProducts(menu: ExtractedMenu): boolean {
  return menu.categories.some((category) =>
    category.products.some((product) => product.isAvailable),
  );
}

function normalizeMenuTemplate(value: string): MenuTemplateId {
  return MENU_TEMPLATE_IDS.includes(value as MenuTemplateId)
    ? value as MenuTemplateId
    : 'ORIGINAL';
}

export function resolveTemplateStyle(
  template: MenuTemplateId,
  originalStyle: MenuStyle,
): MenuStyle {
  return MENU_TEMPLATE_DETAILS[template].style ?? originalStyle;
}

export async function preserveCurrentPublicMenu(
  transaction: Pick<PrismaService, 'restaurant'>,
  restaurantId: string,
): Promise<void> {
  const restaurant = await transaction.restaurant.findUnique({
    include: menuInclude,
    where: { id: restaurantId },
  });
  if (!restaurant || restaurant.publicationInitialized) return;
  if (restaurant.publishedMenu !== null) {
    await transaction.restaurant.update({
      data: { publicationInitialized: true },
      where: { id: restaurantId },
    });
    return;
  }
  const snapshot = toMenuSnapshot(restaurant);
  await transaction.restaurant.update({
    data: {
      publicationInitialized: true,
      ...(hasPublishableProducts(snapshot)
        ? {
            publishedAt: restaurant.updatedAt,
            publishedMenu: snapshot as unknown as Prisma.InputJsonValue,
          }
        : {}),
    },
    where: { id: restaurantId },
  });
}

function isMenuStyle(value: unknown): value is MenuStyle {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const style = value as Partial<MenuStyle>;
  return (
    typeof style.backgroundColor === 'string'
    && typeof style.fontFamily === 'string'
    && typeof style.textColor === 'string'
  );
}

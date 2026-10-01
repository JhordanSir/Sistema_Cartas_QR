import { sql } from 'drizzle-orm';
import {
  boolean,
  bytea,
  char,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Data model of docs/ESPECIFICACION.md §E3. Every change here needs a new
// migration: `pnpm db:generate` (never push or migrate against a hosted database).

export const accountRole = pgEnum('account_role', ['OWNER', 'ADMIN']);
export const restaurantStatus = pgEnum('restaurant_status', ['ENABLED', 'DISABLED']);
export const menuTemplate = pgEnum('menu_template', ['ORIGINAL', 'TRADITIONAL', 'CASUAL', 'PREMIUM']);
export const categoryLayout = pgEnum('category_layout', ['LIST', 'CARDS']);
export const digitizationStatus = pgEnum('digitization_status', [
  'UPLOADING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
]);

/** Style detected by the digitization (§E7). */
export type SourceStyle = {
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
};

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: accountRole('role').notNull(),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique('accounts_email_key').on(table.email),
    // The application normalizes emails; the database refuses anything else so
    // the unique constraint can never be bypassed by case or spacing.
    check('accounts_email_normalized', sql`${table.email} = lower(btrim(${table.email}))`),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    tokenDigest: char('token_digest', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (table) => [
    unique('sessions_token_digest_key').on(table.tokenDigest),
    index('sessions_account_active_idx').on(table.accountId, table.revokedAt, table.expiresAt),
  ],
);

export const restaurants = pgTable(
  'restaurants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerAccountId: uuid('owner_account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 160 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    logoKey: varchar('logo_key', { length: 512 }),
    contactPhone: varchar('contact_phone', { length: 32 }),
    whatsapp: varchar('whatsapp', { length: 32 }),
    address: varchar('address', { length: 500 }),
    instagramUrl: varchar('instagram_url', { length: 2048 }),
    facebookUrl: varchar('facebook_url', { length: 2048 }),
    tiktokUrl: varchar('tiktok_url', { length: 2048 }),
    sourceStyle: jsonb('source_style').$type<SourceStyle>(),
    menuTemplate: menuTemplate('menu_template').notNull().default('ORIGINAL'),
    publishedMenu: jsonb('published_menu').$type<unknown>(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    status: restaurantStatus('status').notNull().default('ENABLED'),
    qrPayload: varchar('qr_payload', { length: 2048 }),
    qrPng: bytea('qr_png'),
    qrSvg: text('qr_svg'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique('restaurants_owner_account_id_key').on(table.ownerAccountId),
    unique('restaurants_slug_key').on(table.slug),
    index('restaurants_status_idx').on(table.status),
  ],
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    layout: categoryLayout('layout').notNull().default('LIST'),
    sortOrder: integer('sort_order').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique('categories_id_restaurant_id_key').on(table.id, table.restaurantId),
    index('categories_restaurant_sort_idx').on(table.restaurantId, table.sortOrder),
  ],
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
    imageKey: varchar('image_key', { length: 512 }),
    isAvailable: boolean('is_available').notNull().default(true),
    sortOrder: integer('sort_order').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    // The pair keeps a product inside its own restaurant: a category of another
    // tenant can never be referenced, even by a buggy query.
    foreignKey({
      name: 'products_category_restaurant_fkey',
      columns: [table.categoryId, table.restaurantId],
      foreignColumns: [categories.id, categories.restaurantId],
    }).onDelete('cascade'),
    unique('products_id_restaurant_id_key').on(table.id, table.restaurantId),
    index('products_restaurant_category_sort_idx').on(
      table.restaurantId,
      table.categoryId,
      table.sortOrder,
    ),
    check('products_description_length', sql`char_length(${table.description}) between 1 and 2000`),
    check('products_base_price_non_negative', sql`${table.basePrice} >= 0`),
  ],
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    sortOrder: integer('sort_order').notNull(),
  },
  (table) => [
    foreignKey({
      name: 'product_variants_product_restaurant_fkey',
      columns: [table.productId, table.restaurantId],
      foreignColumns: [products.id, products.restaurantId],
    }).onDelete('cascade'),
    index('product_variants_restaurant_product_sort_idx').on(
      table.restaurantId,
      table.productId,
      table.sortOrder,
    ),
    check('product_variants_price_non_negative', sql`${table.price} >= 0`),
  ],
);

export const productExtras = pgTable(
  'product_extras',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    sortOrder: integer('sort_order').notNull(),
  },
  (table) => [
    foreignKey({
      name: 'product_extras_product_restaurant_fkey',
      columns: [table.productId, table.restaurantId],
      foreignColumns: [products.id, products.restaurantId],
    }).onDelete('cascade'),
    index('product_extras_restaurant_product_sort_idx').on(
      table.restaurantId,
      table.productId,
      table.sortOrder,
    ),
    check('product_extras_price_non_negative', sql`${table.price} >= 0`),
  ],
);

export const digitizationJobs = pgTable(
  'digitization_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    status: digitizationStatus('status').notNull(),
    photoKeys: jsonb('photo_keys').$type<string[]>().notNull().default([]),
    errorCode: varchar('error_code', { length: 64 }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    // One active job per restaurant (§E3). The predicate is plain SQL on
    // purpose: an index predicate cannot use table-qualified column names.
    uniqueIndex('digitization_jobs_one_active_per_restaurant')
      .on(table.restaurantId)
      .where(sql`status in ('UPLOADING', 'PROCESSING')`),
  ],
);

export const viewEvents = pgTable(
  'view_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
    viewDate: date('view_date', { mode: 'string' }).notNull(),
    viewHour: smallint('view_hour').notNull(),
    visitorHash: varchar('visitor_hash', { length: 64 }).notNull(),
  },
  (table) => [
    unique('view_events_unique_daily_visitor').on(
      table.restaurantId,
      table.viewDate,
      table.visitorHash,
    ),
    index('view_events_restaurant_date_hour_idx').on(
      table.restaurantId,
      table.viewDate,
      table.viewHour,
    ),
    // Retention (§E11) consolidates by date across every restaurant.
    index('view_events_view_date_idx').on(table.viewDate),
    check('view_events_view_hour_range', sql`${table.viewHour} between 0 and 23`),
  ],
);

export const viewSummaries = pgTable(
  'view_summaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    summaryDate: date('summary_date', { mode: 'string' }).notNull(),
    viewHour: smallint('view_hour').notNull(),
    viewCount: integer('view_count').notNull(),
  },
  (table) => [
    unique('view_summaries_restaurant_date_hour_key').on(
      table.restaurantId,
      table.summaryDate,
      table.viewHour,
    ),
    check('view_summaries_view_hour_range', sql`${table.viewHour} between 0 and 23`),
    check('view_summaries_view_count_positive', sql`${table.viewCount} > 0`),
  ],
);

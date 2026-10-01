CREATE TYPE "account_role" AS ENUM('OWNER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "category_layout" AS ENUM('LIST', 'CARDS');--> statement-breakpoint
CREATE TYPE "digitization_status" AS ENUM('UPLOADING', 'PROCESSING', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "menu_template" AS ENUM('ORIGINAL', 'TRADITIONAL', 'CASUAL', 'PREMIUM');--> statement-breakpoint
CREATE TYPE "restaurant_status" AS ENUM('ENABLED', 'DISABLED');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" varchar(320) NOT NULL CONSTRAINT "accounts_email_key" UNIQUE,
	"password_hash" varchar(255) NOT NULL,
	"role" "account_role" NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_email_normalized" CHECK ("email" = lower(btrim("email")))
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"restaurant_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"layout" "category_layout" DEFAULT 'LIST'::"category_layout" NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_id_restaurant_id_key" UNIQUE("id","restaurant_id")
);
--> statement-breakpoint
CREATE TABLE "digitization_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"restaurant_id" uuid NOT NULL,
	"status" "digitization_status" NOT NULL,
	"photo_keys" jsonb DEFAULT '[]' NOT NULL,
	"error_code" varchar(64),
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_extras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"restaurant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"price" numeric(10,2) NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "product_extras_price_non_negative" CHECK ("price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"restaurant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"price" numeric(10,2) NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "product_variants_price_non_negative" CHECK ("price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"restaurant_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"base_price" numeric(10,2) NOT NULL,
	"image_key" varchar(512),
	"is_available" boolean DEFAULT true NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_id_restaurant_id_key" UNIQUE("id","restaurant_id"),
	CONSTRAINT "products_description_length" CHECK (char_length("description") between 1 and 2000),
	CONSTRAINT "products_base_price_non_negative" CHECK ("base_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_account_id" uuid NOT NULL CONSTRAINT "restaurants_owner_account_id_key" UNIQUE,
	"slug" varchar(160) NOT NULL CONSTRAINT "restaurants_slug_key" UNIQUE,
	"name" varchar(160) NOT NULL,
	"logo_key" varchar(512),
	"contact_phone" varchar(32),
	"whatsapp" varchar(32),
	"address" varchar(500),
	"instagram_url" varchar(2048),
	"facebook_url" varchar(2048),
	"tiktok_url" varchar(2048),
	"source_style" jsonb,
	"menu_template" "menu_template" DEFAULT 'ORIGINAL'::"menu_template" NOT NULL,
	"published_menu" jsonb,
	"published_at" timestamp with time zone,
	"status" "restaurant_status" DEFAULT 'ENABLED'::"restaurant_status" NOT NULL,
	"qr_payload" varchar(2048),
	"qr_png" bytea,
	"qr_svg" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"token_digest" char(64) NOT NULL CONSTRAINT "sessions_token_digest_key" UNIQUE,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "view_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"restaurant_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"view_date" date NOT NULL,
	"view_hour" smallint NOT NULL,
	"visitor_hash" varchar(64) NOT NULL,
	CONSTRAINT "view_events_unique_daily_visitor" UNIQUE("restaurant_id","view_date","visitor_hash"),
	CONSTRAINT "view_events_view_hour_range" CHECK ("view_hour" between 0 and 23)
);
--> statement-breakpoint
CREATE TABLE "view_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"restaurant_id" uuid NOT NULL,
	"summary_date" date NOT NULL,
	"view_hour" smallint NOT NULL,
	"view_count" integer NOT NULL,
	CONSTRAINT "view_summaries_restaurant_date_hour_key" UNIQUE("restaurant_id","summary_date","view_hour"),
	CONSTRAINT "view_summaries_view_hour_range" CHECK ("view_hour" between 0 and 23),
	CONSTRAINT "view_summaries_view_count_positive" CHECK ("view_count" > 0)
);
--> statement-breakpoint
CREATE INDEX "categories_restaurant_sort_idx" ON "categories" ("restaurant_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "digitization_jobs_one_active_per_restaurant" ON "digitization_jobs" ("restaurant_id") WHERE status in ('UPLOADING', 'PROCESSING');--> statement-breakpoint
CREATE INDEX "product_extras_restaurant_product_sort_idx" ON "product_extras" ("restaurant_id","product_id","sort_order");--> statement-breakpoint
CREATE INDEX "product_variants_restaurant_product_sort_idx" ON "product_variants" ("restaurant_id","product_id","sort_order");--> statement-breakpoint
CREATE INDEX "products_restaurant_category_sort_idx" ON "products" ("restaurant_id","category_id","sort_order");--> statement-breakpoint
CREATE INDEX "restaurants_status_idx" ON "restaurants" ("status");--> statement-breakpoint
CREATE INDEX "sessions_account_active_idx" ON "sessions" ("account_id","revoked_at","expires_at");--> statement-breakpoint
CREATE INDEX "view_events_restaurant_date_hour_idx" ON "view_events" ("restaurant_id","view_date","view_hour");--> statement-breakpoint
CREATE INDEX "view_events_view_date_idx" ON "view_events" ("view_date");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_restaurant_id_restaurants_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "digitization_jobs" ADD CONSTRAINT "digitization_jobs_restaurant_id_restaurants_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_extras" ADD CONSTRAINT "product_extras_restaurant_id_restaurants_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_extras" ADD CONSTRAINT "product_extras_product_restaurant_fkey" FOREIGN KEY ("product_id","restaurant_id") REFERENCES "products"("id","restaurant_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_restaurant_id_restaurants_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_restaurant_fkey" FOREIGN KEY ("product_id","restaurant_id") REFERENCES "products"("id","restaurant_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_restaurant_id_restaurants_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_restaurant_fkey" FOREIGN KEY ("category_id","restaurant_id") REFERENCES "categories"("id","restaurant_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_owner_account_id_accounts_id_fkey" FOREIGN KEY ("owner_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "view_events" ADD CONSTRAINT "view_events_restaurant_id_restaurants_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "view_summaries" ADD CONSTRAINT "view_summaries_restaurant_id_restaurants_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE;
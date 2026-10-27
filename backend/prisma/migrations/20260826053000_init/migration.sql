-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RestaurantStatus" AS ENUM ('ENABLED', 'DISABLED');

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(160) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "logoPath" VARCHAR(512),
    "contactPhone" VARCHAR(32),
    "whatsapp" VARCHAR(32),
    "address" VARCHAR(500),
    "instagramUrl" VARCHAR(2048),
    "facebookUrl" VARCHAR(2048),
    "tiktokUrl" VARCHAR(2048),
    "backgroundColor" VARCHAR(32) NOT NULL DEFAULT '#ffffff',
    "textColor" VARCHAR(32) NOT NULL DEFAULT '#111827',
    "fontFamily" VARCHAR(100) NOT NULL DEFAULT 'Inter',
    "status" "RestaurantStatus" NOT NULL DEFAULT 'ENABLED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Owner" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantOwner" (
    "restaurantId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantOwner_pkey" PRIMARY KEY ("restaurantId", "ownerId")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Category_sortOrder_nonnegative" CHECK ("sortOrder" >= 0)
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "imagePath" VARCHAR(512),
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Product_basePrice_nonnegative" CHECK ("basePrice" >= 0),
    CONSTRAINT "Product_sortOrder_nonnegative" CHECK ("sortOrder" >= 0)
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductVariant_price_nonnegative" CHECK ("price" >= 0),
    CONSTRAINT "ProductVariant_sortOrder_nonnegative" CHECK ("sortOrder" >= 0)
);

-- CreateTable
CREATE TABLE "ProductExtra" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProductExtra_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductExtra_price_nonnegative" CHECK ("price" >= 0),
    CONSTRAINT "ProductExtra_sortOrder_nonnegative" CHECK ("sortOrder" >= 0)
);

-- CreateTable
CREATE TABLE "ViewEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID NOT NULL,
    "viewedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewDate" DATE NOT NULL,
    "viewHour" SMALLINT NOT NULL,
    "visitorHash" VARCHAR(64) NOT NULL,

    CONSTRAINT "ViewEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ViewEvent_viewHour_range" CHECK ("viewHour" BETWEEN 0 AND 23)
);

-- CreateTable
CREATE TABLE "ViewSummary" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID NOT NULL,
    "summaryDate" DATE NOT NULL,
    "viewHour" SMALLINT NOT NULL,
    "viewCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ViewSummary_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ViewSummary_viewHour_range" CHECK ("viewHour" BETWEEN 0 AND 23),
    CONSTRAINT "ViewSummary_viewCount_nonnegative" CHECK ("viewCount" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");
CREATE INDEX "Restaurant_status_idx" ON "Restaurant"("status");
CREATE UNIQUE INDEX "Owner_email_key" ON "Owner"("email");
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
CREATE INDEX "RestaurantOwner_ownerId_idx" ON "RestaurantOwner"("ownerId");
CREATE INDEX "Category_restaurantId_sortOrder_idx" ON "Category"("restaurantId", "sortOrder");
CREATE UNIQUE INDEX "Category_id_restaurantId_key" ON "Category"("id", "restaurantId");
CREATE INDEX "Product_restaurantId_categoryId_sortOrder_idx" ON "Product"("restaurantId", "categoryId", "sortOrder");
CREATE INDEX "Product_restaurantId_isAvailable_idx" ON "Product"("restaurantId", "isAvailable");
CREATE UNIQUE INDEX "Product_id_restaurantId_key" ON "Product"("id", "restaurantId");
CREATE INDEX "ProductVariant_restaurantId_productId_sortOrder_idx" ON "ProductVariant"("restaurantId", "productId", "sortOrder");
CREATE INDEX "ProductExtra_restaurantId_productId_sortOrder_idx" ON "ProductExtra"("restaurantId", "productId", "sortOrder");
CREATE INDEX "ViewEvent_restaurantId_viewDate_viewHour_idx" ON "ViewEvent"("restaurantId", "viewDate", "viewHour");
CREATE UNIQUE INDEX "ViewEvent_restaurantId_viewDate_visitorHash_key" ON "ViewEvent"("restaurantId", "viewDate", "visitorHash");
CREATE INDEX "ViewSummary_restaurantId_summaryDate_idx" ON "ViewSummary"("restaurantId", "summaryDate");
CREATE UNIQUE INDEX "ViewSummary_restaurantId_summaryDate_viewHour_key" ON "ViewSummary"("restaurantId", "summaryDate", "viewHour");

-- AddForeignKey
ALTER TABLE "RestaurantOwner" ADD CONSTRAINT "RestaurantOwner_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantOwner" ADD CONSTRAINT "RestaurantOwner_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_restaurantId_fkey" FOREIGN KEY ("categoryId", "restaurantId") REFERENCES "Category"("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_restaurantId_fkey" FOREIGN KEY ("productId", "restaurantId") REFERENCES "Product"("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductExtra" ADD CONSTRAINT "ProductExtra_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductExtra" ADD CONSTRAINT "ProductExtra_productId_restaurantId_fkey" FOREIGN KEY ("productId", "restaurantId") REFERENCES "Product"("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ViewEvent" ADD CONSTRAINT "ViewEvent_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ViewSummary" ADD CONSTRAINT "ViewSummary_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

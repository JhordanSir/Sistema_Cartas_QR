-- Track filesystem cleanup independently from Restaurant so a failed cleanup
-- remains durable after the restaurant row has been removed.
CREATE TABLE "AssetDeletionJob" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID NOT NULL,
    "relativePath" VARCHAR(512) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AssetDeletionJob_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AssetDeletionJob_attempts_check" CHECK ("attempts" >= 0),
    CONSTRAINT "AssetDeletionJob_relative_path_check" CHECK (
        "relativePath" ~ '^restaurants/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    )
);

CREATE UNIQUE INDEX "AssetDeletionJob_restaurantId_key" ON "AssetDeletionJob"("restaurantId");
CREATE UNIQUE INDEX "AssetDeletionJob_relativePath_key" ON "AssetDeletionJob"("relativePath");
CREATE INDEX "AssetDeletionJob_createdAt_idx" ON "AssetDeletionJob"("createdAt");

-- The public URL and internal identity are immutable even if a future adapter
-- accidentally attempts to update them.
CREATE OR REPLACE FUNCTION prevent_restaurant_identity_change()
RETURNS trigger AS $$
BEGIN
    IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."slug" IS DISTINCT FROM OLD."slug" THEN
        RAISE EXCEPTION 'Restaurant id and slug are immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Restaurant_identity_immutable"
BEFORE UPDATE ON "Restaurant"
FOR EACH ROW EXECUTE FUNCTION prevent_restaurant_identity_change();

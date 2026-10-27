-- Each QR is materialized at restaurant creation. Legacy rows remain nullable
-- until their first owner QR access, when the application fills them exactly once.
ALTER TABLE "Restaurant"
    ADD COLUMN "qrPayload" VARCHAR(2048),
    ADD COLUMN "qrPng" BYTEA,
    ADD COLUMN "qrSvg" BYTEA;

-- Preserve the immutable restaurant identity and its materialized QR documents.
-- Nullable legacy QR fields may only transition to a value once.
CREATE OR REPLACE FUNCTION prevent_restaurant_identity_change()
RETURNS trigger AS $$
BEGIN
    IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."slug" IS DISTINCT FROM OLD."slug" THEN
        RAISE EXCEPTION 'Restaurant id and slug are immutable' USING ERRCODE = '23514';
    END IF;

    IF (OLD."qrPayload" IS NOT NULL AND NEW."qrPayload" IS DISTINCT FROM OLD."qrPayload")
        OR (OLD."qrPng" IS NOT NULL AND NEW."qrPng" IS DISTINCT FROM OLD."qrPng")
        OR (OLD."qrSvg" IS NOT NULL AND NEW."qrSvg" IS DISTINCT FROM OLD."qrSvg") THEN
        RAISE EXCEPTION 'Restaurant QR is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The weather card geocodes a place name; a free-text street address does not resolve.
ALTER TABLE "Restaurant"
ADD COLUMN "city" VARCHAR(120);

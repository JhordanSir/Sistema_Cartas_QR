CREATE TYPE "MenuTemplate" AS ENUM ('ORIGINAL', 'TRADITIONAL', 'CASUAL', 'PREMIUM');

ALTER TABLE "Restaurant"
  ADD COLUMN "menuTemplate" "MenuTemplate" NOT NULL DEFAULT 'ORIGINAL',
  ADD COLUMN "sourceStyle" JSONB,
  ADD COLUMN "publishedMenu" JSONB,
  ADD COLUMN "publishedAt" TIMESTAMPTZ(3);

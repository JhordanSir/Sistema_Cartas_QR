-- Each section of the published menu chooses how its products are laid out.
-- LIST is the default so every existing category keeps rendering exactly as before.
CREATE TYPE "CategoryLayout" AS ENUM ('LIST', 'CARDS');

ALTER TABLE "Category"
ADD COLUMN "layout" "CategoryLayout" NOT NULL DEFAULT 'LIST';

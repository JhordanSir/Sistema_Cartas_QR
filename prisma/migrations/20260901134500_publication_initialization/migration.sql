-- New restaurants begin with a private draft. Existing restaurants retain their
-- relational menu as the public version until their first edit or publication.
ALTER TABLE "Restaurant"
ADD COLUMN "publicationInitialized" BOOLEAN NOT NULL DEFAULT false;

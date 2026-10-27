-- Enforce that a session belongs to exactly one principal of the declared role.
ALTER TABLE "AuthSession"
ADD CONSTRAINT "AuthSession_principal_role_consistency"
CHECK (
  ("role" = 'OWNER' AND "ownerId" IS NOT NULL AND "adminId" IS NULL)
  OR
  ("role" = 'ADMIN' AND "adminId" IS NOT NULL AND "ownerId" IS NULL)
);

-- Refresh tokens are persisted only as lowercase SHA-256 digests.
ALTER TABLE "AuthSession"
ADD CONSTRAINT "AuthSession_refreshTokenDigest_sha256"
CHECK ("refreshTokenDigest" ~ '^[0-9a-f]{64}$');

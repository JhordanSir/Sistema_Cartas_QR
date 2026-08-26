-- Login identifiers are canonicalized before persistence so PostgreSQL's
-- case-sensitive unique indexes also enforce case-insensitive uniqueness.
ALTER TABLE "Owner"
ADD CONSTRAINT "Owner_email_normalized"
CHECK ("email" = lower(btrim("email")));

ALTER TABLE "Admin"
ADD CONSTRAINT "Admin_email_normalized"
CHECK ("email" = lower(btrim("email")));

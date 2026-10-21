-- Add the Guest role without altering the existing SQLite CHECK constraint in place.
-- Apply only after verifying that the production schema matches the ZIP-origin schema
-- and that no triggers or foreign-key references require additional handling.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE "users_guest_new" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "openId" TEXT NOT NULL UNIQUE,
  "username" TEXT UNIQUE,
  "name" TEXT,
  "email" TEXT,
  "loginMethod" TEXT,
  "role" TEXT NOT NULL DEFAULT 'researcher'
    CHECK ("role" IN (
      'admin', 'supporter', 'researcher',
      'viewer', 'user', 'guest'
    )),
  "approvalStatus" TEXT NOT NULL DEFAULT 'approved'
    CHECK ("approvalStatus" IN (
      'pending', 'approved', 'rejected'
    )),
  "passwordHash" TEXT,
  "passwordVault" TEXT,
  "createdAt" INTEGER NOT NULL
    DEFAULT (unixepoch() * 1000),
  "updatedAt" INTEGER NOT NULL
    DEFAULT (unixepoch() * 1000),
  "lastSignedIn" INTEGER NOT NULL
    DEFAULT (unixepoch() * 1000)
);

INSERT INTO "users_guest_new" (
  "id", "openId", "username", "name",
  "email", "loginMethod", "role",
  "approvalStatus", "passwordHash",
  "passwordVault", "createdAt",
  "updatedAt", "lastSignedIn"
)
SELECT
  "id", "openId", "username", "name",
  "email", "loginMethod", "role",
  "approvalStatus", "passwordHash",
  "passwordVault", "createdAt",
  "updatedAt", "lastSignedIn"
FROM "users";

DROP TABLE "users";

ALTER TABLE "users_guest_new" RENAME TO "users";

CREATE UNIQUE INDEX "users_email_unique"
  ON "users" ("email" COLLATE NOCASE);

CREATE UNIQUE INDEX "users_username_nocase"
  ON "users" ("username" COLLATE NOCASE);

PRAGMA foreign_key_check;

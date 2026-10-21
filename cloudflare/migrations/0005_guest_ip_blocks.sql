-- Guest Demo security extension. Does NOT modify users or existing data.
-- IP addresses are saved only as keyed HMAC-SHA256 hashes, not plaintext.
CREATE TABLE IF NOT EXISTS "guest_ip_blocks" (
  "ip_hash" TEXT PRIMARY KEY NOT NULL,
  "blocked_until" INTEGER NOT NULL,
  "created_at" INTEGER NOT NULL,
  "last_path" TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "guest_ip_blocks_until_idx"
  ON "guest_ip_blocks" ("blocked_until");

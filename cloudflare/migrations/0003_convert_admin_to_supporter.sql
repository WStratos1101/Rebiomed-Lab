CREATE TABLE _admin_supporter_conversion_guard (
  valid INTEGER NOT NULL CONSTRAINT admin_must_exist_and_supporter_must_be_available CHECK (valid = 1)
);
INSERT INTO _admin_supporter_conversion_guard (valid)
SELECT CASE WHEN
  (SELECT COUNT(*) FROM users) = 0 OR (
  (SELECT COUNT(*) FROM users WHERE username = 'admin' COLLATE NOCASE AND role = 'admin') = 1
  AND (SELECT COUNT(*) FROM users WHERE username = 'Supporter' COLLATE NOCASE) = 0
) THEN 1 ELSE 0 END;

UPDATE users
SET username = 'Supporter', name = 'Website Supporter', role = 'supporter',
    approvalStatus = 'approved', updatedAt = unixepoch() * 1000
WHERE username = 'admin' COLLATE NOCASE AND role = 'admin';

DROP TABLE _admin_supporter_conversion_guard;

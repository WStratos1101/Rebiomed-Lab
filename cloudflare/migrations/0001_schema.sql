CREATE TABLE "users" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "openId" TEXT NOT NULL UNIQUE,
  "username" TEXT UNIQUE,
  "name" TEXT,
  "email" TEXT,
  "loginMethod" TEXT,
  "role" TEXT NOT NULL DEFAULT 'researcher' CHECK ("role" IN ('admin', 'supporter', 'researcher', 'viewer', 'user')),
  "approvalStatus" TEXT NOT NULL DEFAULT 'approved' CHECK ("approvalStatus" IN ('pending', 'approved', 'rejected')),
  "passwordHash" TEXT,
  "passwordVault" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  "lastSignedIn" INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE "protocols" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "slug" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "tag" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Bản nháp' CHECK ("status" IN ('Đã duyệt', 'Bản nháp')),
  "version" TEXT NOT NULL DEFAULT 'v0.1',
  "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  "owner" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "duration" TEXT NOT NULL,
  "steps" TEXT NOT NULL,
  "notes" TEXT NOT NULL,
  "pendingEdit" TEXT,
  "pendingEditBy" INTEGER,
  "pendingEditAt" INTEGER
);

CREATE TABLE "samples" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "groupName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Bản nháp',
  "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  "description" TEXT NOT NULL,
  "properties" TEXT NOT NULL,
  "theory" TEXT NOT NULL
);

CREATE TABLE "calculators" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "formula" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "config" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Đã duyệt',
  "active" INTEGER NOT NULL DEFAULT 1,
  "pendingEdit" TEXT,
  "pendingEditBy" INTEGER,
  "pendingEditAt" INTEGER
);

CREATE TABLE "chemicalRecipes" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "groupName" TEXT NOT NULL,
  "baseVolume" TEXT NOT NULL,
  "baseUnit" TEXT NOT NULL,
  "stock" TEXT NOT NULL,
  "note" TEXT,
  "ingredients" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Đã duyệt',
  "active" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE "experimentRuns" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "runCode" TEXT NOT NULL UNIQUE,
  "runDate" TEXT NOT NULL,
  "ctMean" TEXT NOT NULL,
  "efficiency" TEXT NOT NULL,
  "protocolSlug" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE "experimentLogs" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "ownerId" INTEGER NOT NULL,
  "templateName" TEXT,
  "experimentName" TEXT,
  "cellType" TEXT,
  "chemicalsUsed" TEXT,
  "cultureConditions" TEXT,
  "startTime" TEXT,
  "endTime" TEXT,
  "result" TEXT,
  "workDate" TEXT NOT NULL,
  "workDone" TEXT NOT NULL,
  "protocol" TEXT NOT NULL,
  "cellsSeeded" TEXT NOT NULL,
  "note" TEXT,
  "numericNote" TEXT,
  "issue" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE "feedbacks" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "reporterId" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "condition" TEXT NOT NULL,
  "remainingAmount" TEXT,
  "remainingUnit" TEXT,
  "usageCategory" TEXT,
  "description" TEXT,
  "resolvedById" INTEGER,
  "resolvedAt" INTEGER,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX experimentLogs_owner_date_idx ON experimentLogs(ownerId, workDate, id);
CREATE UNIQUE INDEX users_email_unique ON users(email COLLATE NOCASE);
CREATE UNIQUE INDEX users_username_nocase ON users(username COLLATE NOCASE);

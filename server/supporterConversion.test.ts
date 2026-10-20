import { createRequire } from "node:module";
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");
type DatabaseSync = import("node:sqlite").DatabaseSync;
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./_core/password";
const schema = readFileSync(new URL("../cloudflare/migrations/0001_schema.sql", import.meta.url), "utf8");
const migration = readFileSync(new URL("../cloudflare/migrations/0003_convert_admin_to_supporter.sql", import.meta.url), "utf8");
function migrate(db: DatabaseSync) {
    db.exec("BEGIN");
    try {
        db.exec(migration);
        db.exec("COMMIT");
    }
    catch (error) {
        db.exec("ROLLBACK");
        throw error;
    }
}
function setup(username = "admin", role = "admin") {
    const db = new DatabaseSync(":memory:");
    db.exec(schema);
    const passwordHash = hashPassword("existing-admin-password");
    db.prepare("INSERT INTO users (id, openId, username, name, email, role, approvalStatus, passwordHash, passwordVault) VALUES (1, 'immutable-account', ?, 'Old name', 'owner@example.invalid', ?, 'approved', ?, 'sealed-vault')").run(username, role, passwordHash);
    db.exec("INSERT INTO users (id, openId, username, role) VALUES (2, 'other-user', 'other', 'user'); INSERT INTO feedbacks (category, itemName, condition, reporterId) VALUES ('chemical', 'User content', 'Test', 2);");
    return db;
}
const snapshot = (db: DatabaseSync) => db.prepare("SELECT * FROM users ORDER BY id").all();
describe("one-time admin to Supporter migration", () => {
    it("renames only the existing admin and preserves password, immutable identity, other accounts and content", () => {
        const db = setup();
        try {
            const before = snapshot(db);
            const content = db.prepare("SELECT * FROM feedbacks").all();
            migrate(db);
            const after = snapshot(db);
            expect(after[0]).toMatchObject({ ...before[0], username: "Supporter", name: "Website Supporter", role: "supporter", updatedAt: expect.any(Number) });
            expect(verifyPassword("existing-admin-password", after[0].passwordHash as string)).toBe(true);
            expect(after[1]).toEqual(before[1]);
            expect(db.prepare("SELECT * FROM feedbacks").all()).toEqual(content);
        }
        finally {
            db.close();
        }
    });
    it.each([["missing-admin", "admin"], ["admin", "user"]])("refuses to convert %s/%s and rolls back", (username, role) => {
        const db = setup(username, role);
        try {
            const before = snapshot(db);
            expect(() => migrate(db)).toThrow();
            expect(snapshot(db)).toEqual(before);
            expect(db.prepare("SELECT name FROM sqlite_master WHERE name = '_admin_supporter_conversion_guard'").all()).toEqual([]);
        }
        finally {
            db.close();
        }
    });
    it("fails without changing either account if Supporter already exists", () => {
        const db = setup();
        try {
            db.exec("UPDATE users SET username = 'supporter' WHERE id = 2");
            const before = snapshot(db);
            expect(() => migrate(db)).toThrow();
            expect(snapshot(db)).toEqual(before);
        }
        finally {
            db.close();
        }
    });
});

it("allows initialization of a new empty database", () => {
    const db = new DatabaseSync(":memory:");
    try {
        db.exec(schema);
        migrate(db);
        expect(snapshot(db)).toEqual([]);
    } finally {
        db.close();
    }
});

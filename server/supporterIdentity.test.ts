import { describe, expect, it } from "vitest";
import * as server from "./db";
import * as worker from "../cloudflare/generated/db";
for (const [name, database] of [["Node", server], ["D1", worker]] as const) {
    describe(`${name} supporter identity`, () => {
        it.each(["admin", "supporter", "Website Supporter", "bao nguyen gia"])("does not elevate a user named %s", username => {
            const user = { role: "user", username, name: username };
            expect(database.isSupporterAccount(user)).toBe(false);
            expect(database.isDedicatedSupporterAccount(user)).toBe(false);
        });
        it("retains existing supporter identities without rewriting their username", () => {
            const user = { role: "supporter", username: "existing-supporter" };
            expect(database.isSupporterAccount(user)).toBe(true);
            expect(database.isDedicatedSupporterAccount(user)).toBe(true);
            expect(user.username).toBe("existing-supporter");
        });
        it("allows an already privileged admin account to be explicitly assigned supporter", () => {
            expect(database.isDedicatedSupporterAccount({ role: "admin", username: "Admin" })).toBe(true);
            expect(database.isSupporterAccount({ role: "admin", username: "Admin" })).toBe(false);
            expect(database.isDedicatedSupporterAccount({ role: "user", username: "Admin" })).toBe(false);
        });
        it("handles missing accounts", () => {
            expect(database.isSupporterAccount(undefined)).toBe(false);
            expect(database.isDedicatedSupporterAccount(null)).toBe(false);
        });
    });
}

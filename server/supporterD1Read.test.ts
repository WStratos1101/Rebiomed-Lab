import { describe, expect, it, vi } from "vitest";
import { withRuntime, type Env } from "../cloudflare/runtime";
const fixture = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], writes: vi.fn() }));
vi.mock("drizzle-orm/d1", () => ({ drizzle: () => ({
        select: () => ({ from: () => ({ where: () => ({ limit: async () => fixture.rows }) }) }),
        update: fixture.writes, insert: fixture.writes, delete: fixture.writes, run: fixture.writes,
    }) }));
import { getUserById, updateUserRole, updateUserApproval, deleteUserById } from "../cloudflare/generated/db";
describe("D1 account reads preserve stored identities", () => {
    it.each([
        { username: "admin", name: "Admin", role: "user", approvalStatus: "pending" },
        { username: "supporter", name: "Website Supporter", role: "user", approvalStatus: "approved" },
        { username: "old-supporter", name: "Original", role: "supporter", approvalStatus: "approved" },
    ])("does not write or escalate $username/$role on login lookup", async (identity) => {
        fixture.writes.mockClear();
        const stored = { id: 3, ...identity, email: "private@example.invalid", passwordHash: "unchanged-hash" };
        const before = structuredClone(stored);
        fixture.rows = [stored];
        const result = await withRuntime({ DB: {} } as Env, () => getUserById(3));
        expect(result).toMatchObject({ username: identity.username, role: identity.role, approvalStatus: identity.approvalStatus });
        expect(stored).toEqual(before);
        expect(fixture.writes).not.toHaveBeenCalled();
    });
});
describe("D1 protected Supporter account", () => {
    it("rejects demotion, approval revocation and deletion without writing", async () => {
        fixture.rows = [{ id: 3, openId: "immutable-account", username: "Supporter", role: "supporter", approvalStatus: "approved" }];
        fixture.writes.mockClear();
        await withRuntime({ DB: {} } as Env, async () => {
            for (const role of ["admin", "user"] as const)
                await expect(updateUserRole(3, role)).rejects.toThrow();
            for (const status of ["pending", "rejected"] as const)
                await expect(updateUserApproval(3, status)).rejects.toThrow();
            await expect(deleteUserById(3)).rejects.toThrow();
        });
        expect(fixture.writes).not.toHaveBeenCalled();
    });
});

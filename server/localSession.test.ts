import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../shared/const";
const database = vi.hoisted(() => ({ getUserByOpenId: vi.fn(), upsertUser: vi.fn() }));
vi.mock("./db", () => database);
import { sdk } from "./_core/sdk";
const request = (cookie = "", authorization?: string) => ({ headers: { cookie, authorization }, path: "/api/trpc/auth.me" }) as never;
beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_ID", "local-project");
    vi.stubEnv("SESSION_SECRET", "local-session-test-secret-at-least-32-characters");
    database.upsertUser.mockResolvedValue(undefined);
    database.getUserByOpenId.mockResolvedValue({ id: 1, openId: "local-user", role: "admin", approvalStatus: "approved" });
});
afterEach(() => vi.unstubAllEnvs());
describe("local session authentication", () => {
    it("authenticates a signed local session without contacting an external identity provider", async () => {
        const externalRequest = vi.fn();
        vi.stubGlobal("fetch", externalRequest);
        try {
            const token = await sdk.createSessionToken("local-user", { name: "Local Admin" });
            expect(await sdk.authenticateRequest(request(`${COOKIE_NAME}=${token}`))).toMatchObject({ id: 1, role: "admin" });
            expect(database.upsertUser).toHaveBeenCalledWith({ openId: "local-user", lastSignedIn: expect.any(Date) });
            expect(externalRequest).not.toHaveBeenCalled();
        }
        finally {
            vi.unstubAllGlobals();
        }
    });
    it("rejects sessions signed for another project", async () => {
        const token = await sdk.createSessionToken("local-user");
        vi.stubEnv("APP_ID", "another-project");
        await expect(sdk.authenticateRequest(request(`${COOKIE_NAME}=${token}`))).rejects.toThrow();
        expect(database.getUserByOpenId).not.toHaveBeenCalled();
    });
    it("rejects expired sessions", async () => {
        const token = await sdk.createSessionToken("local-user", { expiresInMs: -60000 });
        await expect(sdk.authenticateRequest(request(`${COOKIE_NAME}=${token}`))).rejects.toThrow();
        expect(database.getUserByOpenId).not.toHaveBeenCalled();
    });
    it("does not bootstrap external users or accept preview credentials", async () => {
        const token = await sdk.createSessionToken("local-user");
        await expect(sdk.authenticateRequest(request(`app_session_id=${token}`, `Bearer ${token}`))).rejects.toThrow();
        expect(database.getUserByOpenId).not.toHaveBeenCalled();
    });
    it.each(["pending", "rejected"])("rejects a %s account even with a valid signature", async (approvalStatus) => {
        database.getUserByOpenId.mockResolvedValue({ openId: "local-user", approvalStatus });
        const token = await sdk.createSessionToken("local-user");
        await expect(sdk.authenticateRequest(request(`${COOKIE_NAME}=${token}`))).rejects.toThrow();
        expect(database.upsertUser).not.toHaveBeenCalled();
    });
    it("requires the local session secret rather than a platform fallback", async () => {
        vi.stubEnv("SESSION_SECRET", "");
        vi.stubEnv("EXTERNAL_JWT_SECRET", "unused-platform-test-secret");
        await expect(sdk.createSessionToken("local-user")).rejects.toThrow("SESSION_SECRET");
    });
});

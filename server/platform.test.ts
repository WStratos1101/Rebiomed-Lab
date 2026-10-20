import { afterEach, describe, expect, it, vi } from "vitest";
import { publicPlatformConfig, publicPlatformScript } from "./_core/publicConfig";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "../shared/const";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("local application configuration and sessions", () => {
    it("exposes only named public runtime configuration", () => {
        const env = { ENABLE_EDITOR_TOOLS: "true", EXTERNAL_PROJECT_ID: "project-test", EXTERNAL_API_KEY: "server-only-test", EXTERNAL_JWT_SECRET: "signing-only-test", DATABASE_URL: "db-only-test", EXTERNAL_API_BROWSER_KEY: "public-browser-test", EXTERNAL_ANALYTICS_ENDPOINT: "https://analytics.example", EXTERNAL_ANALYTICS_WEBSITE_ID: "site-test" };
        expect(publicPlatformConfig(env)).toEqual({});
        const script = publicPlatformScript(env);
        for (const value of [env.EXTERNAL_API_KEY, env.EXTERNAL_JWT_SECRET, env.DATABASE_URL])
            expect(script).not.toContain(value);
        expect(publicPlatformConfig({ ...env, NODE_ENV: "production" })).toEqual({});
        expect(publicPlatformConfig({ ...env, ENABLE_EDITOR_TOOLS: "false" })).toEqual({});
        const appended: unknown[] = [];
        const fakeDocument = { createElement: () => ({ setAttribute() { } }), head: { appendChild: (node: unknown) => appended.push(node) } };
        new Function("window", "document", script)({}, fakeDocument);
        expect(appended).toHaveLength(0);
        new Function("window", "document", publicPlatformScript({}))({}, fakeDocument);
        expect(appended).toHaveLength(0);
    });
    it("uses a distinct secure app cookie behind the HTTPS Preview proxy", () => {
        expect(COOKIE_NAME).not.toBe("app_session_id");
        expect(getSessionCookieOptions({ protocol: "http", headers: {} } as never)).toMatchObject({ secure: true, httpOnly: true, sameSite: "none" });
    });
    it("binds signed app sessions to this project and accepts an empty display name", async () => {
        vi.stubEnv("APP_ID", "project-test");
        vi.stubEnv("SESSION_SECRET", "unit-test-signing-key-never-deployed");
        const token = await sdk.signSession({ openId: "user-test", appId: "project-test", name: "" });
        expect(await sdk.verifySession(token)).toMatchObject({ openId: "user-test" });
        vi.stubEnv("APP_ID", "different-project");
        expect(await sdk.verifySession(token)).toBeNull();
    });
});

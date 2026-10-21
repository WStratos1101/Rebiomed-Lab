import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./generated/routers";
import { createContext } from "./context";
import { withRuntime, type Env } from "./runtime";
import { activeGuestIpBlockUntil, trustedCloudflareIp } from "./guestIpGuard";
export default {
    fetch(request: Request, env: Env): Promise<Response> {
        return withRuntime(env, async () => {
            const url = new URL(request.url);
            if (url.pathname === "/api/health") {
                try {
                    await env.DB.prepare("SELECT id FROM protocols LIMIT 1").first();
                    if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32 || !env.REBIOMED_PASSWORD_VAULT_KEY)
                        throw new Error("Missing runtime configuration");
                    return Response.json({ status: "ok" });
                }
                catch {
                    return Response.json({ status: "unavailable" }, { status: 503 });
                }
            }
            if (url.pathname === "/api/platform/config.js")
                return new Response('window.__REBIOMED_CONFIG__={};', { headers: { "Content-Type": "application/javascript", "Cache-Control": "no-store" } });
            if (url.pathname.startsWith("/api/trpc/")) {
                // Gate only API traffic. Static assets and the health endpoint remain
                // accessible for recovery. An IP ban is temporary (15 minutes).
                const ip = trustedCloudflareIp(request);
                if (ip) {
                    try {
                        const expiry = await activeGuestIpBlockUntil(env, ip);
                        if (expiry !== null) {
                            const retryAfterSeconds = Math.max(1, Math.ceil((expiry - Date.now()) / 1000));
                            return Response.json(
                                { error: "IP temporarily blocked after an unauthorized Guest Demo write attempt.", retryAfterSeconds },
                                { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(retryAfterSeconds) } },
                            );
                        }
                    } catch (error) {
                        // Fails closed for API if the security table or database cannot
                        // be read. Apply migration 0005 before deploying this Worker.
                        console.error("[GuestIPGuard] Unable to check active blocks", error);
                        return Response.json(
                            { error: "Guest access protection is temporarily unavailable." },
                            { status: 503, headers: { "Cache-Control": "no-store" } },
                        );
                    }
                }
                if (request.method === "POST" && request.headers.get("origin") && request.headers.get("origin") !== url.origin)
                    return new Response("Forbidden", { status: 403 });
                const response = await fetchRequestHandler({ endpoint: "/api/trpc", req: request, router: appRouter, createContext: ({ resHeaders }) => createContext(request, resHeaders) });
                response.headers.set("Cache-Control", "private, no-store");
                return response;
            }
            if (url.pathname.startsWith("/api/"))
                return Response.json({ error: "Not found" }, { status: 404 });
            return env.ASSETS.fetch(request);
        });
    },
};

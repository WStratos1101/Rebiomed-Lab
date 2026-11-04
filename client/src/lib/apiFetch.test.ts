import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./apiFetch";

afterEach(() => vi.unstubAllGlobals());
describe("API transport", () => {
  it("keeps credentials and mutation body while returning JSON responses unchanged", async () => {
    const response = new Response('{"result":{}}', { headers: { "Content-Type": "application/json" } });
    const fetch = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetch);
    expect(await apiFetch("/api/trpc/content.createDraft", { method: "POST", body: "payload" })).toBe(response);
    expect(fetch).toHaveBeenCalledWith("/api/trpc/content.createDraft", { method: "POST", body: "payload", credentials: "include" });
  });
  it("identifies an HTML SPA fallback instead of claiming the protocol library is empty", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<!doctype html>", { headers: { "Content-Type": "text/html; charset=utf-8" } })));
    await expect(apiFetch("/api/trpc/content.all")).rejects.toThrow("trang web thay vì dữ liệu API");
  });
  it("preserves API errors for tRPC to handle", async () => {
    const response = new Response('{"error":{}}', { status: 403, headers: { "Content-Type": "application/json" } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    expect(await apiFetch("/api/trpc/content.all")).toBe(response);
  });
});

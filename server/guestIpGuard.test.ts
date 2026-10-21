import { describe, expect, it, vi } from "vitest";
import {
  GUEST_IP_BLOCK_DURATION_MS,
  activeGuestIpBlockUntil,
  blockGuestIpNow,
  hashGuestIp,
  shouldBlockGuestForProcedure,
  trustedCloudflareIp,
} from "../cloudflare/guestIpGuard";
import type { Env } from "../cloudflare/runtime";

const secret = "12345678901234567890123456789012";
function fakeD1() {
  const rows = new Map<string, number>();
  const writes = vi.fn();
  const DB = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async first() {
              if (!sql.startsWith("SELECT blocked_until")) throw new Error("Unexpected read SQL");
              const until = rows.get(values[0] as string);
              return until && until > (values[1] as number) ? { blocked_until: until } : null;
            },
            async run() {
              if (!sql.includes("INSERT INTO guest_ip_blocks")) throw new Error("Unexpected write SQL");
              writes(...values);
              rows.set(values[0] as string, values[1] as number);
              return {};
            },
          };
        },
      };
    },
  };
  return { env: { SESSION_SECRET: secret, DB } as unknown as Env, writes, rows };
}

describe("Guest Demo immediate IP protection", () => {
  it("bans only authenticated Guest attempts to call explicit shared/admin mutations", () => {
    expect(shouldBlockGuestForProcedure("guest", "team.deleteUser")).toBe(true);
    expect(shouldBlockGuestForProcedure("guest", "content.deleteProtocol")).toBe(true);
    expect(shouldBlockGuestForProcedure("guest", "content.all")).toBe(false);
    expect(shouldBlockGuestForProcedure("guest", "experimentLogs.create")).toBe(false);
    expect(shouldBlockGuestForProcedure("guest", "auth.userLogin")).toBe(false);
    expect(shouldBlockGuestForProcedure("guest", "auth.updateProfile")).toBe(false);
    expect(shouldBlockGuestForProcedure("guest", "feedbacks.create")).toBe(false);
    expect(shouldBlockGuestForProcedure("user", "team.deleteUser")).toBe(false);
    expect(shouldBlockGuestForProcedure(null, "team.deleteUser")).toBe(false);
  });

  it("does not trust client-supplied forwarding headers", () => {
    const url = "https://protocol.rebiomed.workers.dev/api/trpc/content.all";
    expect(trustedCloudflareIp(new Request(url, { headers: { "X-Forwarded-For": "1.2.3.4" } }))).toBe(null);
    expect(trustedCloudflareIp(new Request(url, { headers: { "CF-Connecting-IP": "203.0.113.11" } }))).toBe("203.0.113.11");
  });

  it("stores an HMAC hash, bans immediately, and expires after 15 minutes", async () => {
    const { env, rows, writes } = fakeD1();
    const ip = "203.0.113.11";
    const now = 1_800_000_000_000;
    const hash = await hashGuestIp(env, ip);
    expect(hash).not.toContain(ip);
    expect(await activeGuestIpBlockUntil(env, ip, now)).toBe(null);
    await blockGuestIpNow(env, ip, "content.deleteProtocol", now);
    expect(writes).toHaveBeenCalledTimes(1);
    expect(rows.get(hash)).toBe(now + GUEST_IP_BLOCK_DURATION_MS);
    expect(await activeGuestIpBlockUntil(env, ip, now + 1)).toBe(now + GUEST_IP_BLOCK_DURATION_MS);
    expect(await activeGuestIpBlockUntil(env, ip, now + GUEST_IP_BLOCK_DURATION_MS)).toBe(null);
  });

  it("does not ban benign or unknown mutation names", async () => {
    const { env, writes } = fakeD1();
    await blockGuestIpNow(env, "203.0.113.11", "experimentLogs.create");
    expect(writes).not.toHaveBeenCalled();
  });
});

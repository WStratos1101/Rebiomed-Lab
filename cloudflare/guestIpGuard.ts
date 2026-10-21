import type { Env } from "./runtime";

// Only explicit, high-impact mutation endpoints. Do not ban for page views,
// missing login, failed passwords, input validation, read-only calls, or demo tools.
// In particular, feedbacks.create/deleteMine and auth.updateProfile are excluded.
export const HIGH_CONFIDENCE_GUEST_WRITES = new Set([
  "content.createDraft",
  "content.createCalculator",
  "content.updateCalculator",
  "content.updateDraft",
  "content.deleteProtocol",
  "content.adminDeleteProtocol",
  "content.deleteSample",
  "content.deleteCalculator",
  "content.approvePendingEdit",
  "content.rejectPendingEdit",
  "content.approveProtocol",
  "content.rejectProtocol",
  "content.approveSample",
  "content.rejectSample",
  "content.approveCalculator",
  "content.rejectCalculator",
  "chemicals.create",
  "chemicals.update",
  "chemicals.delete",
  "chemicals.approve",
  "team.updateRole",
  "team.updateApproval",
  "team.revokeAccess",
  "team.deleteUser",
  "team.resetPassword",
  "team.viewPassword",
  "feedbacks.resolve",
]);

export const GUEST_IP_BLOCK_DURATION_MS = 15 * 60 * 1000;

export function shouldBlockGuestForProcedure(
  role: string | null | undefined,
  path: string,
): boolean {
  return role === "guest" && HIGH_CONFIDENCE_GUEST_WRITES.has(path);
}

// Cloudflare supplies CF-Connecting-IP to Workers. Never use X-Forwarded-For,
// X-Real-IP, or an arbitrary user-supplied header as a trusted identity.
export function trustedCloudflareIp(request: Request): string | null {
  const ip = request.headers.get("CF-Connecting-IP")?.trim();
  if (!ip || ip.length > 45 || !/^[0-9a-fA-F:.]+$/.test(ip)) return null;
  return ip.toLowerCase();
}

// Do not store plaintext visitor IPs in D1. The existing SESSION_SECRET is
// used to HMAC the address; rotation will invalidate active bans.
export async function hashGuestIp(env: Env, ip: string): Promise<string> {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET is missing or too short for guest IP protection");
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(env.SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC", key, encoder.encode(`rebiomed-guest-ip:v1:${ip}`),
  );
  return `v1:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")}`;
}

// Stored in D1 so blocks survive Worker restarts and deployment instances.
export async function activeGuestIpBlockUntil(
  env: Env, ip: string, now = Date.now(),
): Promise<number | null> {
  const ipHash = await hashGuestIp(env, ip);
  const row = await env.DB.prepare(
    "SELECT blocked_until FROM guest_ip_blocks WHERE ip_hash = ? AND blocked_until > ? LIMIT 1",
  ).bind(ipHash, now).first<{ blocked_until: number }>();
  return typeof row?.blocked_until === "number" ? row.blocked_until : null;
}

export async function blockGuestIpNow(
  env: Env, ip: string, procedurePath: string, now = Date.now(),
): Promise<void> {
  if (!shouldBlockGuestForProcedure("guest", procedurePath)) return;
  const ipHash = await hashGuestIp(env, ip);
  await env.DB.prepare(`
    INSERT INTO guest_ip_blocks (ip_hash, blocked_until, created_at, last_path)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(ip_hash) DO UPDATE SET
      blocked_until = excluded.blocked_until,
      last_path = excluded.last_path
  `).bind(ipHash, now + GUEST_IP_BLOCK_DURATION_MS, now, procedurePath).run();
}

# Rebiomed Guest Demo — immediate, temporary API IP lock (Cloudflare Workers)

## Scope

This patch retains the existing **shared Guest demo account**, its intentionally
limited sample data / calculators, and its **two-hour guest journal cleanup**.
Guest still cannot write shared content. It adds an **immediate 15-minute API IP
block** only when an **authenticated Guest** invokes one of the hard-coded
privileged **mutation procedures** in `cloudflare/guestIpGuard.ts`.

Examples which trigger: `content.deleteProtocol`, `content.updateDraft`,
`chemicals.delete`, `team.updateRole` (and other explicitly listed writes).
Examples which NEVER trigger: viewing pages or data, ordinary 403s, signing in,
a wrong password, clicking a restricted UI menu, using demo calculators,
and writing/deleting one's temporary experiment journal. Forbidden requests
remain denied even if the IP header or ban storage is unavailable.

It is impossible to prove malicious intent from a single request. A buggy client
or scripted browser that invokes a forbidden mutation can cause a false block.
The limited trigger list and short TTL reduce that risk. **Anyone sharing that
public IP may lose API access for up to 15 minutes**, including Admin/User;
static content and `/api/health` remain reachable. No WAF rule is installed;
this is Worker-level `/api/trpc/*` API blocking, not Cloudflare-wide IP banning.
A VPN or a different IP can evade this, while authorization still protects data.

Client IP is taken only from Cloudflare's `CF-Connecting-IP` header, not
`X-Forwarded-For`. D1 stores HMAC-SHA256 hashes derived using the existing
`SESSION_SECRET` (no plaintext IP) with expiry and last forbidden procedure.
Rotating SESSION_SECRET invalidates previously stored bans, and separately
affects all existing sessions. Never print SESSION_SECRET or check it into Git.

## Contents

- `cloudflare/worker.ts`: checks IP ban before any tRPC request.
- `cloudflare/context.ts`: supplies a trusted IP to authorization middleware.
- `cloudflare/generated/trpc.ts`: records blocks on explicit Guest misuse.
- `cloudflare/guestIpGuard.ts`: hash, policy, and D1 persistence.
- `cloudflare/migrations/0005_guest_ip_blocks.sql`: **new table only**.
- `server/guestIpGuard.test.ts`: isolated tests.

## Install (after original Guest Demo v2 is applied)

This is an *incremental patch*. It does not include or replace the existing
Guest Demo v2 frontend, backend database logic, or `0004_add_guest_role.sql`.

```sh
cd "$HOME/Desktop/Project/WebsiteLabRebiomed/website-source/web-for-laboratory"
unzip -o "$HOME/Downloads/Rebiomed-Guest-IP-Guard.zip" -d .
pnpm check
pnpm exec tsc --project cloudflare/tsconfig.json
pnpm test
pnpm exec vite build
pnpm verify:public
git diff --check
```

## Production deployment (only after tests pass)

1. Back up D1 as usual, then use `pnpm exec wrangler d1 migrations list DB --remote`.
2. Apply **only** the new `0005_guest_ip_blocks.sql` with
   `pnpm exec wrangler d1 migrations apply DB --remote`.
   **Do this before deploying the updated Worker**, otherwise the security
   check will return HTTP 503 for requests with Cloudflare client IPs.
   Migration `0004_add_guest_role.sql` has already been applied in this project.
3. Review/stage only intended code/migration files; commit and push `main`.
   Do not replace the actual production `wrangler.jsonc` with the template
   contained in the original ZIP. Do not change D1 or Worker names or secrets.
4. Verify logged-in Guest demo flows. For a test ban, use a **dedicated test
   IP / separate network**; first forbidden mutation returns `FORBIDDEN`,
   subsequent tRPC calls from that IP return HTTP 429 with `Retry-After`.
   Test normal User/Admin permissions from a different IP.

## Recovery / diagnostics

```sh
pnpm exec wrangler d1 execute DB --remote --command "SELECT ip_hash, last_path, datetime(blocked_until/1000, 'unixepoch') AS until_utc FROM guest_ip_blocks WHERE blocked_until > unixepoch()*1000;"
```

To unblock a specific entry, copy its **hashed** `ip_hash` and run:

```sh
pnpm exec wrangler d1 execute DB --remote --command "DELETE FROM guest_ip_blocks WHERE ip_hash = 'v1:REPLACE_WITH_DISPLAYED_HASH';"
```

Stale entries do not block any IP and may be purged periodically if desired:

```sql
DELETE FROM guest_ip_blocks WHERE blocked_until <= unixepoch()*1000;
```

No background scheduler, WAF configuration, or new secrets are necessary.

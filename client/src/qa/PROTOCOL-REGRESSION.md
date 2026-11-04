# Protocol regression review — 2026-11-03

Compared against `origin/main` at `5378cb35a765b94190f28455afafebbdfb25700e`, also confirmed with `git ls-remote origin refs/heads/main`.

## Diagnosis

Before the proxy fix, standalone Vite on `127.0.0.1:5173` returned HTTP 200 **text/html** for `/api/trpc/content.all` and `/api/health`: SPA fallbacks, not API responses. Task 2 rechecked the actual running frontend after that fix: both endpoints now return HTTP **500 text/plain**, with no API service listening on the existing Node backend's default port 3000. The frontend shell itself returns HTTP 200. The proxy now reaches the correct API path, but there is no local API to answer it.

The Protocols navigation entry, category mapping, list, detail, editor, linked calculators and mutation calls remained present in the redesigned Home. No CSS rule hid the Protocols feature. Original role conditions and Guest restrictions remained present. API-backed tools and content can also be unavailable under this local configuration.

The remote head was checked again for Task 2 and still matches the hash above, so no fetch/merge/reset was needed. All original `View` members and navigation IDs remain; `toolbox` is an addition. `navigateView()` retains the original Guest-locked views, selection reset and mobile menu behavior. Collapsing the sidebar intentionally hides label spans while preserving the buttons' icons and accessible names. `view === "protocols"` still mounts `ProtocolsView`; selecting a record mounts `ProtocolDetail`. The removed legacy `Overview` function was already unused in `origin/main`, where the overview route rendered `ExperimentJournal` instead.

## Changes

- Standalone Vite proxies API requests to the existing local backend on port 3000. Set the shell variable `REBIOMED_DEV_API_TARGET` when using another local API port, then restart Vite. This variable is not exposed to the client bundle.
- The client identifies an HTML API response and reports a connection error. A failed protocol query no longer also claims the library is empty. Previously fetched records remain available on a refetch failure.
- Draft forms clear only after a successful save. The original code also cleared the editing ID immediately on submit; a failed update could consequently become a create on retry. This frontend error-state fix keeps the API payload and approval rules unchanged.
- Protocol note tables scroll within their container instead of expanding the page.

## Local usage

Use the existing `pnpm dev` full-stack entry point with the project's normal local database configuration. Alternatively run the existing API and Vite separately on different ports; Vite defaults to API port 3000. A frontend dev server alone cannot supply database-backed protocols, authentication or writes. Do not point the proxy back at the Vite server itself.

No backend, Worker, D1, migration, API contract or scientific formula was changed. No production API/database was used for these checks. Static GitHub Pages mode remains read-only as before.

## Verification

- `pnpm check`: passed.
- `pnpm test`: 91 tests passed, including protocol editing/persistence and Guest IP Guard tests.
- `pnpm exec vitest run --config client/src/toolbox.vitest.config.ts`: 12 tests passed, including HTML fallback detection and preserved request credentials/body.
- `pnpm exec vite build`: passed. Existing warning about the classic `api/platform/config.js` script remains.
- `pnpm verify:public`: passed, 76 files including the Source Sans 3 assets from Task 1.
- `protocols.acceptance.cjs`: real HTTP fixture behind the actual Vite proxy, with synthetic data stored only in memory. Checks all seven category mappings, detail/notes/table/linked calculator, successful create/update, failed update retention and retry ID, original user/supporter/Guest action visibility, API failure/recovery, and light/dark detail at 1440/390/320px. No browser runtime errors or page overflow.
- `toolbox.acceptance.cjs`: passed its existing functional checks and 59 layout cases for calculators, qPCR, Master Mix, journal, sample search, chemical workspaces, administration, retained inputs, account isolation and API recovery. No browser runtime errors. Artifacts: `/private/tmp/rebiomed-protocols-regression/checks.json`; protocol artifacts: `/private/tmp/rebiomed-protocols-qa/checks.json`.

The fixture proves frontend transport and interactions; it does not establish the availability of the user's actual local database or validate real account permissions end to end. The existing protocol-edit/persistence and Guest IP Guard tests pass; server-side permission conditions were inspected and remain unchanged.

## Task 2 extended review

No additional missing application component or removed route was found. This task extends the browser regression suite and updates this report; it does not overwrite Home, change typography, insert application data, or change access rules. The earlier frontend repairs remain in `Home.tsx`, `dashboard.css`, `main.tsx`, `lib/apiFetch.ts`, `lib/apiFetch.test.ts` and the frontend development proxy in `vite.config.ts`.

| Feature | Finding and verification |
| --- | --- |
| Sidebar, View, navItems, navigateView | Present; checked against origin/main and the actual local browser. |
| Protocol list, categories and search | Present; original four category groups retained, search/status filters functional in isolated browser tests. Unknown/legacy categories follow the original fallback mapping. |
| Detail, steps, notes and tables | Present; browser checks cover text notes and structured table notes. |
| Step-linked calculators | Present; opens the attached calculator workspace, including protocol-only calculators in the broader suite. |
| Create/edit and draft/approved status | Present; tests exercise the original mutation paths, refreshes, and retry after a failed edit without losing the record ID. |
| Approve/reject draft protocols | Present in `AdminReviewView`; confirmed request IDs, successful refresh and cancellation of rejection in the isolated fixture suite. |
| Approve/reject pending protocol edits | Present; tested `content.approvePendingEdit` / `content.rejectPendingEdit` with the `protocol` kind and correct edit ID. |
| Delete protocol | Original Admin/Supporter handler preserved; confirmed deletion uses `content.adminDeleteProtocol` and the existing confirmation flow. |
| Hypoxia/HighPressure protocols | Both branches open detail, preserve category during edit, and open the create form with the correct category. |
| Calculator/Chemical Mixing/Journal/Samples/Admin | Existing broader suite passes 59 functional/layout cases, including retained inputs, filtering, copy, local validation and API recovery. |
| User Account and Guest | Account UI checks cover read-only username, Guest-disabled email, absent Guest save action, hidden admin navigation and blocked special-workspace navigation. Real login/profile writes were not performed. |

The extended protocol suite also checks the original User/Supporter/Guest action visibility and both themes at 1440/390/320px. There are no browser runtime errors or page overflow in the checked cases. Fixture data exists only inside the QA process and is never used as an application fallback.

### Actual local browser, without fixtures

The actual app at port 5173 was opened in Chromium without request interception, mock data or writes. Protocol navigation and the API error alert are visible. The alert is retained at 1440/768/390/320px in light/dark mode, and the page does not claim that the database is empty. The create editor and step fields open; cancel returns to Protocols. No save was attempted. Artifact: `/private/tmp/rebiomed-protocols-live/checks.json` and screenshots in the same directory.

### Outstanding issues and limits

1. The actual local API/database is unavailable, so real protocol records, login, approvals and writes cannot be validated end to end in that environment. Start the appropriate existing local API and configure `REBIOMED_DEV_API_TARGET` if it uses a different port, then restart Vite. No production data/database or migration was accessed.
2. An inherited UI inconsistency also exists in `origin/main`: a non-admin can see a delete icon for a draft, while `handleDeleteProtocol` rejects every non-admin caller. The server separately has a draft-delete endpoint, but the original frontend handler does not use it. This review preserves that original behavior rather than changing permissions or workflow under a restoration task. Approved-record delete controls remain hidden for User/Guest.
3. Full Guest Demo sign-in/IP-block behavior was not exercised against a live backend. Guest UI restrictions were checked in the browser fixture; existing Guest IP Guard tests pass, and the Worker/guards are unchanged.
4. The existing build warning about the classic platform configuration script remains. No commit, push or deployment was performed.

Files changed specifically during Task 2: `client/src/qa/protocols.acceptance.cjs` (approval, rejection, deletion, special categories and account/Guest regression checks) and this report. No application UI or business logic change was necessary in this recheck.

To reproduce the browser check, run Vite on 4173 with `REBIOMED_DEV_API_TARGET=http://127.0.0.1:4318`, then run `node client/src/qa/protocols.acceptance.cjs`. It requires an existing Playwright installation and Chromium; `REBIOMED_PLAYWRIGHT_MODULE` can point at that installation. No new dependency is required by the app.

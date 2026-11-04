# Rebiomed Toolbox — implementation and verification

Updated 2026-11-03. This record distinguishes implemented UI work from the limits of local verification.

| Brief area | Status and evidence |
| --- | --- |
| Product / UX audit | Repository and repeated-use workflows reviewed. Independent design and technical reviews identified the remaining specialized-field, draft-retention and retrieval gaps addressed below. |
| Visual identity / tokens | White light canvas, graphite dark theme, restrained teal, Be Vietnam Pro and IBM Plex Mono. Normative tokens and component rules: `DESIGN.md` and `dashboard.css`. |
| Application shell | Compact/collapsible desktop sidebar; Sổ tay phòng thí nghiệm first; mobile drawer, focus trapping, Escape, skip link, stable status/notification locations and tool search shortcut. |
| Toolbox | Search without Vietnamese diacritics, purpose/type filters, separate calculator/protocol/utility rows, account-scoped favorite and recent IDs. No experiment values in these preferences. |
| Calculator workspace | Existing scientific formulas/defaults retained. Adjacent units; touched/submit numeric diagnostics; accessible dense-table inputs; existing domain warnings; formatted-result copying. Task-specific scientific layouts retained. |
| Draft retention | In-memory specialized drafts survive toolbox lookup, tool changes and Master Mix tab changes. Account-keyed store is recreated on identity change. Custom drafts include tool ID/formula/config identity to prevent collisions. Existing explicit cDNA/qDNA temporary saves retain their original duration and are schema-checked before restoration. Reloading the page clears memory-only drafts. |
| Protocol / references | Protocol text/status search and linked tools retained. Critical notes precede attached inputs. Samples have text/group filters and a distinct no-match state. |
| Journal | Retained editing draft, visible save controls, local text/date filtering, no-match/date-range feedback, API error preserves entered text. Export/select-all/delete scope remains the original full/selected dataset and is explicitly described, including entries hidden by filters. |
| Administration | Account, review-queue and resource search are local display filters. Formula-variable typing no longer changes its React key. Labels and independent recipe-edit buttons support keyboard use. Authorization and mutation handlers remain in place. |
| Adapt / harden / polish | Specialized light/dark viewport matrix; table-local scrolling; malformed browser metadata; numeric syntax/default blanks/valid zeros; API-error/retry; clipboard with units; focus; scoped drafts. Shared typography/radius drift in specialized styles was aligned with the existing tokens. No ignore suppression added. |
| Preservation | Changes limited to `client/src/`. No backend, Worker, D1, migration, shared scientific library, API contract or package dependency changes. |

## Repeatable checks

```sh
pnpm check
pnpm test
pnpm exec vitest run --config client/src/toolbox.vitest.config.ts
pnpm exec vite build
pnpm verify:public
```

The existing suite has 91 tests. The focused frontend suite adds 9 numeric-feedback and browser-metadata tests.

For browser acceptance, start Vite locally on port 4173 and run `qa/toolbox.acceptance.cjs` with an available Playwright installation. `REBIOMED_PLAYWRIGHT_MODULE` may point to that module; `PLAYWRIGHT_BROWSERS_PATH` may point to its installed browsers. The suite does not add Playwright to application dependencies. Optional `REBIOMED_QA_BASE_URL` is restricted to localhost. `REBIOMED_QA_OUTPUT` controls the artifact directory.

The fixture suite exercises specialized numeric errors, optional/default blanks, valid zero, units in copied output, retained drafts, duplicate-name custom-tool isolation, account-change clearing, sample/account/review/journal search, date filters, API mutation failure without lost draft, network retry, variable-editor focus, and account-menu Escape. Its batched layout matrix records 59 checks, including eight workspaces in both themes at 1440, 390 and 320 CSS pixels; additional library/seeding checks include 768 pixels. The recorded run has no page-level horizontal overflow or runtime errors.

## Verification limits

Browser accounts, records and API failures in this suite are synthetic, intercepted locally. It does not authenticate against production, mutate D1, or validate a deployed Worker. Existing auth/permission/Guest IP Guard tests and source diff checks provide regression evidence, not production end-to-end certification.

The browser matrix uses Chromium emulated viewports. Physical iOS/Android touch behavior, other engines and a full screen-reader/WCAG 2.2 AA conformance audit have not been certified. Labels, keyboard focus, mode semantics, numeric feedback and responsive layouts were addressed within the frontend scope.

Vite still emits the pre-existing warning for `api/platform/config.js` being a non-module script. Changing that platform script is outside this frontend redesign.

# Approval badge alignment — Task 3

## Presentation changes

- `ApprovalStatus` preserves the supplied status text and renders nothing for undefined, null or blank values. Approved uses the existing teal palette, draft/pending uses amber, rejected uses the danger palette, and unfamiliar states remain neutral. No database value is converted.
- Badge metrics: Be Vietnam Pro 600, 12px text, 18px line-height, 26px minimum height, 4px vertical/8px horizontal padding, 4px radius, no shrinking or wrapping.
- `.approval-header` uses `minmax(0, 1fr) auto`, start alignment and a 16px column gap (12px on mobile). The badge is a direct grid child at row 1/column 2 with end alignment. Titles and metadata occupy the independent left track. Headers without a supplied status use a single column.
- Detail actions occupy a separate row so edit/delete controls cannot displace the badge. No viewport positioning or arbitrary offsets are used.

## Components audited

| Surface | Result |
| --- | --- |
| Protocol list cards | Badge moved out of the category/title flow into its own upper-right header track. Short and multiline titles share the same badge inset. |
| Protocol detail, including special-condition protocols | Badge moved out of the metadata row into the upper-right header track. Metadata and calculator attachments are retained. |
| Sample detail | Same header grid; badge tone now follows the actual supplied status instead of always styling it as approved. |
| Chemical recipe workspace | Badge moved out of the stock/note paragraph into the upper-right header track. Missing status no longer displays an invented “Đã duyệt” badge. |
| Chemical stock table | Record statuses remain in the dedicated status column, aligned to the top/right of each cell. A table-wide badge would incorrectly represent several records as one. Missing status leaves the cell empty. |
| Static GitHub Pages protocol detail | Uses the same grid and badge component. Snapshot values are unchanged. |
| Toolbox/calculator cards, sample list cards, special-experiment lists, admin inventory and review panels | No approval badge existed on these surfaces, so none was invented. Role chips, editor category/context labels, review actions and filter chips are not record approval statuses and remain unchanged. |

## Files changed for this task

- `client/src/components/toolbox/ApprovalStatus.tsx`
- `client/src/pages/Home.tsx`
- `client/src/components/ChemicalMixingView.tsx`
- `client/src/pages/GitHubPagesApp.tsx`
- `client/src/dashboard.css`
- `client/src/lib/approvalStatus.test.ts`
- `client/src/qa/approval-badges.acceptance.cjs`
- `client/src/DESIGN.md`
- `client/src/qa/APPROVAL-BADGES-REVIEW.md`

Only presentation markup/styles and QA/documentation changed. Approval callbacks, permissions, formulas, API payloads/endpoints, backend, Worker, D1 and stored statuses were not modified. Existing font files remain intact.

## Verification

- `pnpm check`: passed.
- `pnpm test`: 91 tests passed.
- Frontend Vitest suite: 15 tests passed, including absent-status behavior, preserved draft/pending text and neutral unknown states.
- `pnpm exec vite build`: passed. Existing warning about the classic platform configuration script remains.
- `pnpm verify:public`: passed, 76 files.
- Badge browser suite: 56 cases across 1440/768/390/320px in light/dark mode. Measures badge top/right coordinates, font metrics, overlap, clipping and page overflow on actual protocol/sample/chemical components, plus alignment in stock-table cells. Measured titles include one, two, three and longer multiline cases; dense metadata, approved/draft/pending and absent statuses are covered. No browser runtime errors. Fixtures are confined to browser interception and never enter app fallback data or a database.
- Broader frontend regression suite: 59 cases passed, including calculators, protocol-only calculator attachments, copy, retained inputs, journal, samples, admin, account isolation and typography checks.
- Screenshots and geometry results: `/private/tmp/rebiomed-approval-badges/`; broader regression artifacts: `/private/tmp/rebiomed-typography-final/`.
- Static production preview: 4 viewport cases passed using the existing snapshot. Badge top/right offsets are 0px relative to its header; font is 12px; no page overflow or browser runtime errors. Results: `/private/tmp/rebiomed-approval-badges/static-checks.json`.

## Existing static-mode limitation

The static dev entry fails with a relative `BASE_URL`: `new URL("github-pages-data.json", import.meta.env.BASE_URL)` throws `Invalid base URL`. The same expression exists in `origin/main`. It is outside this presentation task and was not changed. Static badge verification uses a separate local production build with an absolute base (`http://127.0.0.1:4174/`), output under `/private/tmp/rebiomed-static-badge-build`; no deployment is involved.

No commit, push or deployment was performed. Browser checks use Chromium, not native Safari/iOS.

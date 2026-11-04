# Typography refinement — 2026-11-03

The existing shell, column structure, theme colors and component design are preserved. Changes concern type roles, authored font declarations and the control sizing needed to accommodate more readable text. No calculation, protocol content, API, authentication, permission or backend logic changed.

## Fonts

- Be Vietnam Pro remains the interface, navigation, label, protocol and chemical instruction font.
- Source Sans 3 is imported locally from `@fontsource/source-sans-3` at weights 400, 500 and 600. Quantitative inputs, numeric results, unit annotations, chemical amounts and numerical qPCR cells use `--font-data` and tabular numerals.
- Ordinary prose and text-based formula descriptions use `--font-ui`. Warning sentences retain the interface font and body size even when displayed in a result region.
- IBM Plex Mono declarations were removed from the active stylesheet. Existing font files under `client/public/fonts` were retained.

## Scale and control adjustments

| Role | Previous authored sizes | Current sizes |
| --- | --- | --- |
| Caption, metadata, helper text | 11px and smaller shorthand declarations | 12px minimum |
| Secondary descriptions | 11–12px | 12–13px |
| Form labels and actions | 11–12px | 13–14px |
| Navigation | 11–12px | 13px; calculator names 14px |
| Form inputs | Some 12–14px | 14–16px desktop; visible mobile controls 16px |
| Reading text and instructions | 11–13px | 14px, with content-specific line-height |
| Section headings | Several 14–17px | 18px for procedure, note and chemical section headings |
| Page headings | Responsive and static overrides including 24px | 26–30px in the refined page hierarchy |
| Primary calculator results | Mixed 16–32px | 26px |
| Journal preview table/caption | 10px / 11px | 12px / 12px |

Rules are edited in their owning stylesheets rather than applying a universal font-size multiplier. `font` shorthand declarations were reviewed because they reset size, family and line-height. The specific qPCR first-column and Master Mix input selectors receive matching mobile rules to prevent them overriding the 16px input size. Scientific unit selectors have sufficient width, helper text has a 20px minimum line box, and navigation can wrap without shrinking icons. Numeric result/unit strings remain together; unusually long numeric results can scroll inside their own region. Wide tables retain local horizontal scrolling.

## Files changed for this task

- `package.json`, `pnpm-lock.yaml`: one new font dependency.
- `client/src/main.tsx`: three Source Sans 3 weight imports.
- `client/src/index.css`: component typography and shorthand declarations, including legacy/static frontend surfaces.
- `client/src/dashboard.css`: tokens, quantitative font roles, result scale and responsive control rules.
- `client/src/components/hypoxia.css`: labels, helpers, numeric metrics and chart numerals; includes rules loaded lazily.
- `client/src/components/special.css`: UI font token and reading/control sizes.
- `client/src/lib/journalExport.ts`: preview typography only; local Be Vietnam Pro font faces and readable table/caption sizes. Exported fields and values are unchanged.
- `client/src/DESIGN.md`: current typography roles and token values.
- `client/src/qa/toolbox.acceptance.cjs`: optional `REBIOMED_QA_TYPOGRAPHY=true` assertions for font loading, quantitative font/numeral style, mobile control sizes and clipped control text.
- `client/src/qa/TYPOGRAPHY-REVIEW.md`: this report.

## Validation

- `pnpm check`: passed.
- `pnpm test`: 91 tests passed.
- `pnpm exec vite build`: passed; the existing classic-script warning for `api/platform/config.js` remains.
- `pnpm verify:public`: passed, including bundled font assets.
- Browser suite: 59 cases across 1440/768/390/320px, light/dark workspaces, with synthetic API fixtures. Source Sans 3 weights and Be Vietnam Pro load successfully. Quantitative input font and tabular numerals verified. Visible mobile form controls meet 16px. No clipped button text, page overflow or browser runtime errors in the checked cases.
- Journal preview: local synthetic row displays Vietnamese correctly, loads Be Vietnam Pro, and computes a 12px table size.
- Visual inspection: desktop Seeding and mobile dark ICC/Master Mix captures retain the existing design. Artifacts are at `/private/tmp/rebiomed-typography-final/`.

These responsive checks use Chromium. They verify the CSS conditions for preventing iOS input zoom; Safari/iOS was not run directly. No commit, push or deployment was performed.

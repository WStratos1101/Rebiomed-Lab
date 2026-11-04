---
name: Rebiomed Scientific Toolbox
description: Quiet precision and editorial clarity for scientific work.
colors:
  paper: "#ffffff"
  paper-deep: "#f3f5f3"
  white: "#ffffff"
  ink: "#202d2a"
  muted: "#53665e"
  line: "#d8e0da"
  control-border: "#7c9089"
  teal: "#14645d"
  teal-light: "#e5f1ec"
  action: "#14645d"
  action-hover: "#0c514b"
  on-contrast: "#ffffff"
  contrast-surface: "#203b35"
  amber: "#84521b"
  amber-light: "#fcf1df"
  blue: "#375e7e"
  danger: "#ab3038"
  danger-light: "#fbeded"
  focus: "#14645d"
  scrim: "rgb(10 25 18 / .5)"
  dark-paper: "#141b1a"
  dark-paper-deep: "#242e2b"
  dark-white: "#1c2522"
  dark-ink: "#e5eee8"
  dark-muted: "#b0c1b7"
  dark-line: "#3a4b42"
  dark-control-border: "#738f7f"
  dark-teal: "#8bcfba"
  dark-teal-light: "#213e33"
  dark-action-hover: "#1b756b"
  dark-contrast-surface: "#163b33"
  dark-amber: "#ebc18b"
  dark-amber-light: "#3b3022"
  dark-blue: "#a8c7e1"
  dark-danger: "#ffabb1"
  dark-danger-light: "#40282b"
  dark-focus: "#8bcfba"
typography:
  page:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.025em"
  mobile-page:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "26px"
    fontWeight: 600
  mobile-result:
    fontFamily: "Source Sans 3, Be Vietnam Pro, sans-serif"
    fontSize: "26px"
    fontWeight: 500
  section:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "18px"
    lineHeight: 1.5
  body:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
  ui:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "13px"
  label:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "13px"
  caption:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "12px"
  input:
    fontFamily: "Source Sans 3, Be Vietnam Pro, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  result:
    fontFamily: "Source Sans 3, Be Vietnam Pro, sans-serif"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  control: "5px"
  panel: "8px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "20px"
  space-6: "24px"
  space-8: "32px"
components:
  button:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-contrast}"
    rounded: "{rounded.control}"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  navigation-active:
    backgroundColor: "{colors.teal-light}"
    textColor: "{colors.teal}"
    rounded: "{rounded.control}"
  scientific-input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.input}"
    rounded: "{rounded.control}"
    height: "44px"
  panel:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.panel}"
---

# Design System: Rebiomed Scientific Toolbox

## Overview

**Creative North Star: "Scientific Toolbox"**

Quiet precision and editorial clarity guide the interface. A compact application rail frames practical scientific work; clear labels, visible units and readable results carry the hierarchy. The light canvas is white, following the explicit visual direction. Dark mode uses graphite surfaces with restrained teal emphasis.

**Key Characteristics:**

- Compact navigation and scan-friendly resource lists.
- Vietnamese UI typography paired with monospaced quantitative data.
- Flat surfaces, functional borders and limited accent color.
- Layouts shaped by each scientific task.

This is developer guidance, with no runtime import. Token values are extracted from [dashboard.css](dashboard.css); its `:root` and `:root.dark` declarations remain the implementation source. Dark-prefixed entries describe the corresponding overrides; unchanged tokens inherit their light values. Component behavior is grounded in [Home.tsx](pages/Home.tsx) and [toolbox components](components/toolbox/ToolboxLibrary.tsx).

## Colors

### Primary

Restrained teal marks primary actions, selected navigation, favorites and key results. Pale teal supports selection without turning whole workspaces into accent surfaces. Use action tokens for filled buttons and teal tokens for foreground emphasis: their dark-mode behavior differs.

### Neutral

Paper and white define the light canvas and work surfaces. Paper-deep differentiates secondary or computed controls; ink carries primary text, muted carries supporting text, line separates content, and control-border makes editable boundaries apparent. Graphite equivalents provide the dark-mode hierarchy.

Amber communicates cautions, danger communicates errors or destructive actions, and blue supports existing categorical distinctions. Preserve explicit text and symbols alongside state colors. Focus uses the theme-aware focus token.

**The Result Rule.** Reserve strong color emphasis for a decision, selected state or scientific result; keep surrounding explanation quiet.

## Typography

Be Vietnam Pro is the UI family for Vietnamese labels, navigation, headings and explanatory copy. Source Sans 3 is the data family for numeric inputs, units, formulas, quantitative tables and results. The YAML records the implemented hierarchy; use the roles rather than introducing a separate display style.

Page headings are compact and moderately weighted. Supporting introductions have a readable measure capped at `70ch`. Quantitative results use tabular numerals. Keep prose in the UI family even when it sits beside a formula. Mobile form controls retain a readable input size; result and page-heading sizes adapt in the stylesheet.

## Layout

Approval badges use `ApprovalStatus` and an `.approval-header` grid with `minmax(0, 1fr) auto` tracks. The badge occupies the upper-right track with start alignment; titles and metadata wrap in the left track. Use Be Vietnam Pro 600 at 12px, a 26px minimum height, 4px/8px padding and a 4px radius. Approved uses teal, draft/pending uses amber, rejected uses the danger palette, and unfamiliar status values use neutral styling without rewriting their text. Omit the badge when no status was supplied. Statuses in tabular records remain in their own column, aligned to the top and right. Role labels, editor category tags and workflow buttons are not approval badges; do not invent a status for them.

The desktop shell uses a `244px` sidebar, collapsing to an icon rail of `64px`, with a content wrapper capped at `1560px`. Keep **Sổ tay phòng thí nghiệm** first in navigation. The rail scrolls independently so navigation and account controls remain reachable.

Use the extracted spacing rhythm for controls, groups and sections. The resource library is a list with aligned metadata and a separate favorite control. Search, kind and task-category filters sit above collection controls for all, favorites and recent items.

Extend scientific layouts by task: calculators follow formula → inputs with units → result and copy action; protocols use sequential steps with contextual tools; journal work pairs editing and entries; qPCR and chemical workflows preserve their tables and quantitative comparisons. Share primitives without forcing every tool into the same card grid.

At `1200px`, journal/account columns stack and library controls wrap. At `900px`, library metadata condenses and calculator navigation becomes a picker. At `760px` (also narrow landscape up to the preceding breakpoint), the sidebar becomes a dismissible drawer. At `480px`, utility controls wrap further. Preserve flexible columns, wrapping text and reachable actions as content grows.

## Elevation & Depth

Work panels and navigation are flat: borders, spacing and tonal surfaces establish structure. Floating account, action and notification menus use the menu shadow (`0 8px 28px rgb(18 39 31 / .14)` in light mode; `0 8px 28px rgb(0 0 0 / .32)` in dark mode). Keep that elevation for overlays.

Drawer motion uses `--duration-ui` (`120ms`) and `--ease-ui` (`cubic-bezier(.2, .7, .2, 1)`). Status and page-entry animations are suppressed. Honor the existing reduced-motion rules, including removal of drawer transitions and decorative transforms.

## Shapes

Controls use the control radius; bounded content panels use the panel radius. Formula and result regions use divider lines rather than extra containers. Borders are `1px`; focus indicators are a visible `2px` outline with separation from the target. Preserve stronger input borders and dashed computed-field boundaries.

## Components

- **Application navigation:** active items pair a pale accent surface with stronger text. Collapsed icons retain accessible names; mobile navigation provides close and overlay dismissal.
- **Tool library:** accent-insensitive Vietnamese search scans name, description, category and kind. Keep favorite actions independent from opening a resource. Show contextual empty states, loading status and retry feedback while retaining available resources.
- **Preferences:** [useToolboxPreferences](hooks/useToolboxPreferences.ts) stores only navigation IDs in browser storage scoped to the current guest/account identity. Recent items follow opening order. Do not store experiment inputs, results or credentials, or describe this as server synchronization.
- **Session drafts:** [SessionDraftContext](contexts/SessionDraftContext.tsx), provided by Home around the workspace modules after the library, keeps specialized tool drafts in memory across module unmounts and reopening from search. The account key recreates the store when identity changes. A browser refresh ends these drafts. Existing explicit cDNA and qDNA10hour saves remain; an available session draft takes precedence when reopening. Keep draft storage separate from browser-persisted navigation preferences.
- **Scientific field:** [ScientificField](components/toolbox/ScientificField.tsx) connects label, help and validation text programmatically. Keep a fixed unit or unit selector beside the number. Computed values are read-only with a distinct boundary; errors include readable text and an invalid state. Shared [numericFeedback](lib/numericFeedback.ts) explains finite-number, inclusive/exclusive minimum and integer constraints, accepts optional blanks, and never changes the calculator's input or scientific validation. Match diagnostic rules to each existing field's contract.
- **Numeric tables:** [NumericTableInput](components/toolbox/NumericTableInput.tsx) gives each numeric cell an accessible row-specific label and associated diagnostic after interaction. Preserve the table's scientific structure and input values.
- **Result:** give the numeric answer and unit clear precedence, with formula context and the existing copy-result action nearby. [CopyResultRegion](components/toolbox/CopyResultRegion.tsx) copies the displayed, formatted output with its units and label; it does not recalculate values. Copy availability follows the result's available state. Keep the existing scientific formatting and precision.
- **Local resource search:** [ResourceSearch](components/toolbox/ResourceSearch.tsx) provides a labeled search control for filtering the current resource view. Keep filters local and retain meaningful empty-state feedback. Journal filtering changes the visible entries; export and select-all retain their full-data scope, explained by the visible scope note.
- **Specialized workspaces:** hypoxia and special-condition surfaces reuse the shared typography and radius tokens while retaining their task-specific arrangement. Extend these shared primitives rather than introducing a parallel scale.
- **Buttons and feedback:** filled teal denotes the main action; bordered and quiet controls support secondary actions. Keep visible focus, disabled states, accessible names for icon controls, and status feedback for asynchronous changes.

## Do's and Don'ts

- Do reuse theme tokens and the existing control primitives.
- Do keep units next to numeric fields and connect errors to their fields.
- Do preserve all scientific formulas, calculation behavior, rounding, validation and result meaning.
- Do preserve authentication, permissions, APIs, database behavior and backend contracts when extending the interface.
- Do test long Vietnamese labels, large results, empty collections, unavailable storage and narrow screens.
- Do preserve account-scoped, memory-only draft recovery and the distinction between a visible journal filter and full-data bulk actions.
- Don't add invented activity metrics or repeated decorative cards to the toolbox list.
- Don't use color alone to convey a state or distinguish editable and computed values.
- Don't place scientific data in browser preference storage.
- Don't recompute scientific values for copy actions or use display diagnostics to alter calculation behavior.
- Don't replace task-specific scientific layouts with a uniform dashboard template.

When extending numeric diagnostics, run `pnpm exec vitest run client/src/lib/numericFeedback.test.ts` to check locale input, optional blanks and boundary feedback.

The optional `.impeccable/design.json` sidecar is intentionally omitted to honor the authorized `client/src` write boundary. Maintain this document alongside the CSS and component sources when the implemented system changes.

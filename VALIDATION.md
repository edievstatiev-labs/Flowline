# Validation record

Checks below were observed during implementation on 27 October 2026. Browser results were reported by the integrating agent after exercising the running application. Current checks appear first; earlier checks remain as history and do not substitute for verification of the latest charts and drawer.

## Current: README recording and demo data

- **71 tests across 7 files pass**; production build, typecheck and static export pass. The new integration regression verifies visible and accessible 2.5% / 97.5% shares after a one-workflow correction. No inference change was made.
- User-supplied dynamic CSV retained byte-for-byte with hash: 2,436 rows, 40 workflows, no invalid starts; all Unknown / Engineer review before correction. A separate 29-row teaching fixture is verified in the actual app: Daily and Hourly In scope; 30 minutes and Unknown Engineer review. Both source files and /data/ downloads are included.
- Real browser walkthrough covers import, search, trace, Scatter, exact row 2396, reasoned correction, refresh/reimport persistence, reset, and export. Actual downloaded export has 40 rows and correct original/effective values/reason. Temporary correction reset after capture. Browser warning/error log is empty.
- MP4 full decode passes: 30.7 seconds, 1328×996, 30 fps, H.264. GIF: 30.76 seconds, 1120×840, 246 frames, looping. Poster and representative import/trace/correction/export frames visually checked. Captions and progress framing sit outside the app; idle gaps omitted. The final export ending was recaptured after the percentage repair.
- README uses an inline GIF linked to the MP4, with downloadable CSVs and expected simple-fixture results. Recording notes, timings and an actual demo export are included.

## Earlier repository submission audit

- Confirmed all four assignment deliverables and linked each from the README. SPEC.pdf is exactly one page and contains the definition of done and all five paired workflow examples.
- Reran the current test suite: **70 tests across 7 files passed**. App/inference source and the previously verified production export are unchanged.
- Verified the original sample CSV and feedback, extracted text, lockfile, source/license hash manifests, tests and ready-to-run out/ build are included. Git ignores dependency/cache/environment files; the static submission is deliberately tracked.
- GitHub confirmed the target repository was empty and private; the upload preserves visibility. Audit checkpoint: **21:33:26 UTC / 23:33:26 Europe/Sofia**.

## Current revision: Larger charts and Scatter drawer

- **70 tests pass across 7 files**; production build, TypeScript and static export pass. Two new real React/Bklit tests cover run navigation across midnight, exact source-row identity, fractional-second preservation and the initially closed chart-details disclosure. Inference remains 32 In scope / 8 Engineer review across all 40 sample workflows.
- Donut is 160px; the area plot is 152px. Both figures use an aligned 184px frame on desktop. Clearer headings replace duplicate metadata. At document scroll 1000, overview top is 0 and table heading top is 213, matching the 213px overview height. No internal main-page scroll container was found.
- At 1440, 768 and 390px, document width matches viewport width. On mobile the larger overview follows ordinary page scrolling; the scatter is 240px and its selected-run card stacks the row action beneath time/status. Desktop Scatter is 260px. Light and dark were visually inspected.
- In wf_DQ_ADHOC_RECON, Home then six ArrowRight presses selects run 7 of 9: 19 August 2026, 10:55:10. Tooltip has a padded title and Status / CSV row fields. View row 569 opens that exact source row alone and focuses the referenced-row heading.
- Chart details expands inline, revealing shortest/median/longest gaps of 18.4 minutes / 6.3 days / 21.9 days and the warning that these do not establish a schedule. It starts collapsed. The long gray footer paragraphs were removed from the default drawer view.
- The drawer retains body locking, keyboard controls and its single body scroll region. The plot retains its actual source timestamps and 0–24 shared domain. Source dates use explicit UTC formatting for the source wall-clock encoding.

- Fresh extracted static build ran without node_modules. All 40 results loaded; keyboard selection and exact row 569 inspection passed. At 390px, document width remained 390 and drawer-body was the sole scrolling region with source rows and chart details open. Packaged console warnings/errors were empty. Final functional checkpoint: **21:30:11 UTC / 23:30:11 Europe/Sofia**. BeUI 70 / Bklit 101 local source-hash records match; SPEC.pdf remains one page.

## Table, filters and title — 21:11 checkpoint

- **68 tests pass across 6 files**, and the production build/typecheck/static export pass. No inference or data changes were made.
- The visible count/order paragraph above the table was removed. The title's descriptive sentence is available through a compact BeUI info badge/popover. Keyboard Enter opens it; Escape dismisses and restores trigger focus. At 390px, the 290px rule panel stays within the viewport.
- Open filter menus paint above sticky headings. All three options are visible on desktop and mobile. Pointer selection, keyboard End/Enter, and trigger focus restoration work.
- Corrected with no corrections shows No matching workflows and Clear filters. Possibly inactive returns only wf_MKT_CAMPAIGNS. Inactivity plus Engineer review correctly shows an empty state. FIN plus Engineer review returns 3 rows; FIN plus In scope returns 8. Clearing restores all 40.
- Spacer hiding now targets aria-hidden cells, preserving the actual empty-state cell. Mobile empty guidance spans the full result width.
- Rounded table surfaces use overflow:clip rather than a scroll container. After document scroll900, overview top remained0 and table header top153. No nested vertical scrolling elements were found.

- Fresh extracted static package ran without node_modules. Light/Dark menus show all three options, Corrected exposes the empty state, and Clear filters resets the view. The 390px rule popover stayed at x88–378; source-run table showed all three rows. Packaged console warnings/errors were empty. Final checkpoint: **21:11:22 UTC / 23:11:22 Europe/Sofia**.
- BeUI/Bklit source hash records match; SPEC.pdf remains single-page.

## Linked legend and Gradient glow — 21:04 checkpoint

- All **68 tests across 6 files** pass, including three new integration regressions for legend keyboard preview/reset, slice-to-legend hover and unique gradient/mask IDs across two overviews. Existing inference outcomes remain 32 In scope / 8 Engineer review for all 40 workflows.
- The production build, typecheck and static export pass. Only the missing official Legend component was installed; existing Area/Pie sources were reused.
- Pointer inspection confirmed both directions: the Engineer review legend previews 8 / 20% and grows its amber slice; hovering the blue slice previews 32 / 80% and highlights In scope. Focus/Enter and Escape/blur preview/reset also passed.
- Light and Dark were visually checked. Dark chart blue resolves through a lighter host token. No area grid/background remains; Area uses fillOpacity 0.6, gradientToOpacity 0, strokeWidth 2 and fadeEdges, while keeping the original data, 88px plot, axes and tooltip.
- At 1440px the 153px overview pins at viewport top and the 40.5px table header pins directly beneath at y153. Mobile at 390px has no horizontal overflow; the always-visible stacked overview pins at 297px height. Neither list view adds an internal scrolling container.
- Drawer opening still locks the document and makes the background inert. After closing on mobile, Shift+Tab moved to the previous workflow with focused text at y484.6, below the pinned overview ending at y297.

- Fresh extracted package loaded all 40 workflows and the linked overview through a static server **without node_modules**. Its legend preview showed 8 Engineer review / 20%; Area's actual SVG gradient stops were 0.6 and 0. Dark/mobile screenshots and the existing run-history drawer were checked. Only drawer-body scrolled while open; body overflow was hidden. Packaged console warnings/errors were empty. Final functional checkpoint: **21:04:38 UTC / 23:04:38 Europe/Sofia**.
- Provenance verification: BeUI 70 source/local records and Bklit 101 records match the shipped files. The spec PDF remains one page.

## BeUI controls and Bklit charts — 20:53 checkpoint

- **65 tests pass across 5 test files**: 49 engine, 6 real BeUI Drawer/focus, 6 chart-data and 4 real Bklit integration tests. The final working source and freshly extracted source both passed tests and production build/typecheck/static export by the **20:53:14 UTC** verification checkpoint. Chart-data tests verify 1,152 sample starts across 90 source-day bins; exact duplicate/invalid exclusion with zero-export dates; all-invalid empty charts; source-clock/status/row details for a midnight retry; and bounded aggregation for a 1900–9999 span, preserving the total in at most 366 periods.
- Daily charts include zero-export dates. Spans over 366 days switch to labelled periods with exact start/end bounds in tooltips. Zero is missing exported history, not proof of no execution.
- A browser check exposed a mismatched shared axis: the plot used 0–24 while YAxis read a 0–100 fallback, initially concealed by a clamped formatter. The chart now publishes its actual domain, the formatter is unclamped, and grid/axis share explicit 0/6/12/18/24 ticks. Two regressions cover the repair.
- The run-history Bklit Scatter uses a 0–24 source-hour scale, explicit UTC date/time formatting, status/possible-rerun series, exact timestamp/status/row tooltips, previous/next run controls, Arrow/Home/End navigation and source-row inspection. All plots disable entry animation.
- Official BeUI/Bklit sources, MIT licenses and original/local file-hash manifests are preserved. Final manifest verification found no local-hash mismatches across BeUI's 70 entries or Bklit's 93 entries (including repeated dependency entries). Four real Bklit integration regressions passed: two verify native-pan reaches Area/Scatter plots without touchmove cancellation; two verify Scatter and YAxis share the actual domain and explicit clock ticks. Only DOM size/ResizeObserver behavior is shimmed.
- Browser checks at 390, 768 and 1440 px found no horizontal overflow. Only the drawer body scrolls while open; the document is locked. The main overview is collapsed by default on mobile.
- The Scatter's actual clock labels show 0–24 hours. Native pointer hover selected the 7 August run at source row 445; keyboard End selected 7 September at row 757. Inspect selected row opened the matching row alone and focused its heading.
- The compact header showed 40 workflows, 32 In scope and 8 Engineer review, plus 1,152 exported starts across 90 days.
- Actual correction-to-overview wiring passed: changing one DQ Unknown result to Daily with a reason updates the donut to 33 In scope / 7 Engineer review, total 40. Reset restores 32 / 8.
- The expanded two-chart overview is readable in dark mode at 390 px and on desktop at 1440 px, with no overflow. Source-row headings and drawer-toolbar spacing were tightened; only the drawer body scrolls.
- System theme follows the host dark preference; explicit Light and Dark modes were also exercised.
- A final control audit replaced the three remaining native app buttons with BeUI Button, preserving their inline appearance. All visible app buttons now use the requested control library.
- Fresh-package `npm ci` passed (651 packages installed, 652 audited, zero reported vulnerabilities); the extracted source then passed all 65 tests and production build.
- The fresh ZIP was extracted and its included static build launched with `node scripts/serve.mjs` **before dependency installation**. It loaded all 40 workflows, 1,152 starts and both Bklit overview charts.
- In that packaged app, keyboard End followed by Inspect selected row opened exactly one source row: 757, timestamp `2026-09-07 07:00:51`; its heading received focus. At 1440 px desktop and 390 px mobile the page had no horizontal overflow.
- Packaged console warnings/errors were empty; no hydration issue was observed. Desktop, drawer and mobile screenshots were saved. This completed the current revision's verification at **20:53:14 UTC (22:53:14 Europe/Sofia)**. The earlier checkpoints below remain as development history.

## Document check

`SPEC.pdf` was regenerated with ReportLab after the drawer revision, reopened with pypdf and confirmed to contain exactly one page and all five workflow examples. The latest 140-dpi Poppler render was visually inspected: no clipping, overlap or illegible glyphs. Embedded DejaVu fonts avoid the original substitution issue.

## Earlier checkpoints

The following observations preceded the latest chart request. They are retained as development history.

## First submission automated checks

- **`npm test`: 47 passing tests**: 44 engine tests and 3 React motion-wrapper tests.
- **`npm run typecheck`: passed.**
- The engine suite asserts cadence and scope for all 40 supplied workflows against an explicitly reviewed expected-results table; it also verifies 1,152 input runs.
- Coverage includes daily reruns, hourly jitter, misleading names, month-end and fortnightly/twice-monthly calendars, single-run uncertainty, failed-only weekly history, missing end times/occurrences, daily activity windows, inactivity, malformed CSV and timestamps, duplicate rows, special workflow names, correction validation, persistence serialization, dataset isolation, and CSV audit fields/escaping.
- Boundary regressions cover exact 60 and 59 minutes; 59.5, 59.8, 59.95 and 59.99 minutes; 59 minutes 59 seconds; a change from 60 to 59.9 minutes; and a nearby slower candidate that could otherwise hide subhour drift.
- The 3 motion-wrapper tests render the real React wrapper and exercise preference handling with the animation boundary mocked. They do **not** claim a live operating-system preference change or rendered GSAP animation was verified.

## Browser checks before the later UX revision

These checks describe the original layout. The later user-requested UX/scroll revision supersedes its navigation and scrolling behavior; current-flow checks appear at the start of this record.

- Desktop at 1440 px and mobile at 390 px: no horizontal overflow after layout repairs; workflow selection and details remain usable.
- Light, dark and system theme settings exercised.
- Trace expands with Enter; a trace evidence action opens the exact 2 referenced source rows and transfers focus to the source-row panel.
- A 30-minute correction requires a reason, changes scope to Engineer review, survives reload, and resets to the original inference.
- The actual downloaded CSV was independently parsed: exactly 40 data rows. The corrected SLS orders workflow retained original Daily / in-scope and effective Every 30 minutes / engineer-review, with the entered reason, timestamp and original evidence.
- Malformed quoting shows an upload error and retains the existing review.
- A file containing only invalid start timestamps presents Unknown / Engineer review and “History unavailable.”
- Search and filters exercised with monthly, hourly, business-window and possibly inactive workflows.
- No browser warnings or hydration errors were observed during these checks.

## First UX revision checks

- That revision uses a compact topbar, a focused list/detail journey, and document scrolling. The sidebar and independently scrolling panels are removed.
- Mobile at 390 px: detail, chart and source rows have zero nested scroll areas and no horizontal overflow. At 768 px, the list has no overflow and its header stays available while scrolling. Desktop at 1440 px was also exercised.
- Trace expands with Enter. “Inspect 2 source rows” opens exactly those rows and focuses the source heading.
- Correcting the DQ workflow from Unknown to Daily requires a reason and changes scope to In scope. The saved correction survives reload.
- The review queue stays stable after that correction: Next reaches `wf_FIN_ACCRUALS_V2` at position 2 of 8.
- Refreshing in detail, opening a workflow and returning with Back works. After uploading a new dataset, Back through history from the prior dataset safely stays on the new list.
- The actual export was parsed: 40 data rows, including original Unknown and effective Daily with the correction reason and timestamp. The test correction was reset afterward.
- A malformed CSV preserves the existing sample review. An upload with invalid starts shows Unknown, 0 starts and Engineer review.
- That revision's **47 tests passed**. Production build, its TypeScript check, and static export also pass.
- Browser inspection used CUA screenshots and DOM checks rather than the skills' separate inspector route, following the active browser-tool policy.

## First submission package checks

- Production build, TypeScript check and static export: **passed**. Final packaged static smoke check is recorded with the fresh-unzip check below.
- Fresh unzip and dependency-free static launch: **passed**. `node scripts/serve.mjs` served the included build on port 3001 before dependency installation. The sample loaded all 40 workflows and detail Trace expanded with Enter.
- Packaged static browser check: **passed**. No console warnings, errors or hydration issues were observed. At 1280 px viewport width the page width was 1280 px, with zero nested scrollers. Desktop and detail screenshots were saved.
- Fresh-unzip dependency verification: **passed**. `npm ci` installed 624 packages, followed by **47 passing tests** and a passing `npm run typecheck`.
- Official GitHub React Bits registry CLI fallback after the public endpoint returned HTTP 403: **succeeded**. A byte comparison matched generated FadeContent source to the inspected vendor source before integration.

## BeUI revision checks

- **55 tests pass**: 49 engine tests, 5 real BeUI Drawer integration tests and 1 hidden-tab focus-trap regression. **Typecheck passes.** The Drawer tests render real React/Drawer/MotionConfig behavior; jsdom's visible-rectangle layout is shimmed. They cover focus entry, Tab/Shift+Tab containment, stray background focus, Escape, inert release, return focus and scroll restoration. They do not establish a live OS reduced-motion preference change.
- Two engine repairs add regressions for normal next-day successes after failures alongside genuine retries, and supported 72-hour fixed cadence. All 40 sample results remain unchanged.
- Desktop at 1440 px: the right drawer is 760 px wide. At 390 px it fills the viewport; page width remains 390 px. The first workflow is visible at approximately 442 px in an 844 px viewport.
- The list stays mounted behind the drawer. With 92 source rows open, only the drawer body scrolls; the page body is locked and inert, with no nested chart/table scrolling. Closing retains the list position.
- Browser Back closes and Forward reopens. Escape releases page locking and returns focus. The app closes immediately and distinguishes workflow history with `#workflow=` after a same-URL history defect was found and fixed.
- BeUI Select works in the correction form; saving without a reason triggers required-field validation. A DQ Unknown-to-Daily correction changes scope to In scope, survives reload, and resets correctly. Unsaved drafts survive Previous/Next; Next stays at `wf_FIN_ACCRUALS_V2`, position 2 of 8 after a scope change.
- The downloaded export was independently parsed: 40 rows, including original Unknown, effective Daily, reason and timestamp. The test correction was reset afterward.
- Trace expands with Enter. Inspecting 2 referenced rows opens those exact rows and focuses the source heading after the drawer animation settles.
- BeUI primary-blue white-text contrast was improved from approximately 3.68:1 to 5.15:1; amber badge text was darkened.
- The BeUI-only production build and a fresh-unzip static launch passed at this checkpoint; a subsequent fresh `npm ci` installed 610 packages successfully. These checks precede the Bklit chart request and do not validate that later change.

## Limits of these checks

Cadence fitting remains an inference from incomplete observations. Timestamp precision, start jitter and sparse history can make a near-hourly subhour schedule indistinguishable from an hourly one. Fractional-minute schedules may be Unknown rather than receive an exact label; they still route to Engineer review when unresolved. The checks do not establish scheduler truth, confirmed retry identities, retirement, enterprise-scale performance or full assistive-technology coverage.

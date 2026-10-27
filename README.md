# Workflow Frequency Review

A browser prototype for deciding migration scope from incomplete run history. **Hourly or less frequent is in scope; faster or unknown goes to engineer review.** The included synthetic sample has 1,152 runs across 40 workflows: **32 in scope and 8 needing engineer review**, before corrections.

## Run

Use **Node.js 22.12 or newer**. The included static build needs no dependency installation:

```sh
node scripts/serve.mjs
```

Open `http://localhost:3000`. To develop or rebuild:

```sh
npm ci
npm run dev
```

To check and produce a fresh static build:

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

`build` writes `out/`; `preview` serves it over HTTP. Package installation and a fresh build need network access for packages/fonts. The included build works offline, without a backend, API key or runtime AI. Use the same localhost port to retain browser corrections.

## A three-minute review

1. Open **Engineer review**. Unknown workflows and schedules faster than hourly need attention first.
2. Return to **All** and search for `wf_SLS_ORDERS_INCR`. Open its Daily result in the review drawer and expand the decision trace to inspect the possible reruns. **Run history** provides the chart and original rows.
3. Check `wf_WEB_CLICKS` (Hourly despite jitter), `wf_PAY_AUTH_HOURLY` (30 minutes despite its name), and `wf_FIN_MONTH_END_CLOSE` (Monthly).
4. Choose **Change frequency**, supply a reason and save. Scope recomputes; the original inference remains visible. Refresh to check persistence, then reset the correction.
5. **Export review** downloads original/effective decisions, evidence and correction audit fields for every workflow.

Search and scope filters narrow the list. The badge beside the title opens the scope rule; empty filter combinations offer Clear filters. Previous/Next use a stable review queue. Close, Escape or Back returns to the same list position and focus. The list stays mounted behind a right-hand drawer, which fills narrow screens. The list scrolls normally; while the drawer is open, its body is the single scrolling area. Unsaved drafts survive switching workflows during the session, but not refresh.

Upload CSVs up to **10 MB** with `workflow_name,start_time,end_time,status` columns; end times may be empty. Starts use `YYYY-MM-DD HH:mm[:ss[.SSS]]` (or a `T` separator), without offsets or `Z`. Files stay in the browser. Corrections are stored by exact file fingerprint and browser origin; changing whitespace starts a separate review. Export before clearing browser data or changing browsers.

## Included

| Requested deliverable | Where to find it |
|---|---|
| One-page spec, definition of done, good/bad examples | [Editable spec](SPEC.md) · [Single-page PDF](SPEC.pdf), with five paired examples |
| Working CSV prototype with corrections | [App](app/page.tsx) · [Inference](lib/engine/inference.ts) · included `out/` build; run instructions above |
| AI prompts/conversations and time spent | [AI-use and time record](AI_USE.md), including actual mistakes and corrections |
| Setup, assumptions, exclusions and likely failures | This README; [validation record](VALIDATION.md) provides test and browser evidence |

[source-data/](source-data/) preserves the original CSV, feedback PDF, extracted text and hashes. The attachment labelled `feedback.md` actually serves a PDF. Source, locked dependencies, tests and the static build are included. The latest implementation passes **70 tests** and a production build.

[Dashboard preview](preview-desktop.jpg) · [Drawer preview](preview-drawer.jpg) · [Mobile preview](preview-mobile.jpg)

## Assumptions and likely failures

- Timezone-free timestamps are source wall-clock values, unaffected by the viewer's timezone. Explicit offsets and `Z` are rejected. Inactivity is relative to the export's latest start, not today.
- All statuses count. Exact duplicates are disclosed and removed; invalid starts block automatic inclusion for that workflow. A failed-only history can still establish cadence.
- Missing observations cannot prove scheduler configuration: exporting every second hourly run can look two-hourly. Start delays, daylight-saving changes, multiple schedules and ad hoc runs can hide or contradict a pattern. Fractional-minute schedules may remain Unknown.
- Possible reruns are bounded assumptions, not verified identities; a genuine second schedule can resemble a retry. They remain inspectable. Monthly matching can overfit three observations and does not prove an exact business-calendar rule.
- Possible inactivity uses the original inferred frequency and does not change scope. It cannot prove retirement; unknown frequency has no inactivity estimate. Human corrections do not retrain the inference.

Scheduler integrations, migration execution, authentication, shared review, server storage, automatic retirement and deployment are excluded. Enterprise-scale performance and browser storage quotas are outside this prototype.

## UI sources

**BeUI** supplies controls; **Bklit** supplies every chart. The larger overview stays sticky above the list on desktop; on narrow screens it follows normal page scrolling to leave room for the results. Its linked donut legend shows counts and shares; hover or keyboard focus previews a category in the center. The area uses the Gradient glow recipe. Run history has a padded Bklit tooltip and a selected-run panel with exact source time, status and a direct CSV-row action; the info button reveals chart guidance and gap statistics. It shows unique valid starts across all statuses: daily for the sample, grouped into labelled periods for spans over 366 days. Empty dates indicate no exported rows, not verified inactivity or throughput. The stack is Next.js, React 19, Tailwind CSS 4 and Inter, with system/light/dark themes. Taste-skill and ui-design-brain guided the flow. `THIRD_PARTY_NOTICES.md` records source provenance, adaptations, licenses and removed earlier libraries.

Optional Codex shadcn MCP setup for adding registry components later:

```toml
[mcp_servers.shadcn]
command = "npx"
args = ["shadcn@latest", "mcp"]
```

The application needs no MCP server. Earlier registry-access issues are recorded in `AI_USE.md`.

## An actual AI mistake

An early engine classified steady **59.8-minute** starts as hourly and included them. Adversarial checks exposed the error. The repaired drift check routes tested subhour cases to Engineer review. An earlier UI cleanup also hid every last table cell to remove a spacer, which accidentally hid empty-results guidance. It now targets only aria-hidden spacers, and open filter menus paint above sticky headings. AI also initially treated the feedback attachment as Markdown; file inspection corrected it to PDF. `AI_USE.md` records these corrections and `VALIDATION.md` distinguishes previous checks from the current revision.

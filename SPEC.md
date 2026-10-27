# Workflow frequency review

**Purpose.** Help a migration engineer decide which workflows can enter migration from incomplete run history. Evidence and human corrections must remain inspectable. Synthetic sample: 1,152 runs, 40 workflows.

**One rule.** A supported schedule of **60 minutes or longer is In scope**. Faster schedules and unresolved frequency require **Engineer review**. Workflow names and run success do not determine frequency.

## Input and inference

Accept CSV columns `workflow_name,start_time,end_time,status`; empty end times are valid. Treat timestamps without offsets as source wall-clock values. Sort starts across all statuses, disclose exact duplicate removal and invalid rows, and prevent automatic inclusion when a workflow has invalid starts.

Fit fixed intervals and daily, weekday, weekly, fortnightly, twice-monthly and monthly patterns. Fixed intervals need eight starts and six direct intervals; recurring daily windows need two windows. Allow bounded jitter (at most ten minutes or 20% of interval) without rounding sustained 59-minute cadence into hourly. Three consistent observations across consecutive months can establish monthly frequency; one quarterly-looking observation cannot. Do not demand 90 days from purged logs.

Exclude a possible rerun only when an independently supported slower pattern explains it: successful off-schedule start immediately after an unsuccessful attempt, within 24 hours or half the interval, whichever is smaller. Require three baseline occurrences, two unaffected occurrences, no supported faster pattern, and no more than 25% exclusions. Keep those observations visible. Unexplained contradictions remain Unknown. Flag possible inactivity after more than 30 days or three expected intervals, whichever is longer, relative to the export's latest start; this is advisory.

## Review and correction

Open a sample or CSV. Search a three-column list (workflow, frequency, scope), with unknown and fast schedules first. Open a right-hand drawer for Decision and its expandable trace; Run history reveals the chart and source rows. Keep the list mounted behind it. The drawer fills narrow screens and owns one scroll area while open. Close, Escape or Back restores list position/focus; Previous/Next retain a stable queue. Require frequency and reason for corrections; recompute scope, preserve inference, and support reset. Drafts survive workflow switching, not refresh. Save corrections locally by dataset fingerprint; export original/effective results, reasons and timestamps. No server upload, runtime AI, or account.

## Examples: acceptable / unacceptable

| Workflow | Acceptable output | Unacceptable output |
|---|---|---|
| `wf_SLS_ORDERS_INCR` | Daily; In scope; possible reruns explained | Every 49 minutes from the shortest gap |
| `wf_WEB_CLICKS` | Hourly; In scope; jitter explained | Too frequent because of one 52-minute gap |
| `wf_PAY_AUTH_HOURLY` | Every 30 minutes; Engineer review | Hourly from its name |
| `wf_FIN_MONTH_END_CLOSE` | Monthly; In scope | Unknown because months differ in length |
| `wf_FIN_QTR_REG_RPT` | Unknown; Engineer review | Quarterly from one observed run |

## Definition of done

All 40 sample workflows have inspectable results; the five examples above pass. Tests cover 59/60-minute boundaries, reruns across midnight, frequent alternating failure/success runs, failed-only histories, missing occurrences/end times, daily windows, monthly calendars and malformed input. Corrections persist across reload, remain isolated by dataset, reset and export correctly. Keyboard operation, narrow screens, light/dark/system themes, reduced motion and hydration are checked. Tests and static production build pass; a fresh unzip runs using the README. Submission includes source, locked dependencies, sample/feedback, this spec and single-page PDF, README and an honest AI/time log.

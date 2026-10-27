import { parseCsv } from "./csv"
import type {
  DatasetAnalysis,
  EvidenceStep,
  Frequency,
  RunRow,
  ScopeDecision,
  WorkflowResult,
} from "./types"
const MINUTE = 60_000,
  DAY = 1440 * MINUTE
const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y)
  return s.length
    ? (s[Math.floor((s.length - 1) / 2)] + s[Math.floor(s.length / 2)]) / 2
    : 0
}
const round = (n: number) => Math.round(n * 100) / 100
export function frequencyLabel(frequency: Frequency): string {
  if (frequency.kind !== "interval")
    return {
      daily: "Daily",
      weekdays: "Weekdays",
      weekly: "Weekly",
      fortnightly: "Every two weeks",
      "twice-monthly": "Twice monthly",
      monthly: "Monthly",
      unknown: "Unknown",
    }[frequency.kind]
  if (frequency.minutes === 60) return "Hourly"
  if (frequency.minutes % 60 === 0)
    return `Every ${frequency.minutes / 60} hours`
  return `Every ${round(frequency.minutes)} minutes`
}
export function scopeForFrequency(frequency: Frequency): ScopeDecision {
  return frequency.kind === "unknown" ||
    (frequency.kind === "interval" && frequency.minutes < 60)
    ? "engineer-review"
    : "in-scope"
}
export function expectedIntervalMinutes(frequency: Frequency): number | null {
  if (frequency.kind === "unknown") return null
  if (frequency.kind === "interval") return frequency.minutes
  return {
    daily: 1440,
    weekdays: 1440,
    weekly: 10080,
    fortnightly: 20160,
    "twice-monthly": 21600,
    monthly: 44640,
  }[frequency.kind]
}
interface Fit {
  frequency: Frequency
  detail: string
  residual: number
  direct: number
  warnings: string[]
}
function lattice(times: number[], minutes: number) {
  const base = times[0]
  const index = times.map((t) => Math.round((t - base) / (minutes * MINUTE)))
  if (new Set(index).size !== index.length) return null
  const raw = times.map((t, i) => (t - base) / MINUTE - index[i] * minutes)
  const phase = median(raw),
    errors = raw.map((r) => r - phase),
    tolerance = Math.min(10, minutes * 0.2)
  if (errors.some((r) => Math.abs(r) > tolerance)) return null
  const direct = index.slice(1).filter((n, i) => n - index[i] === 1).length
  // Residual slope tests accumulated drift rather than rounding individual gaps.
  const xMean = index.reduce((s, v) => s + v, 0) / index.length
  const yMean = raw.reduce((s, v) => s + v, 0) / raw.length
  const variance = index.reduce((s, v) => s + (v - xMean) ** 2, 0)
  const slope = variance
    ? index.reduce((s, v, i) => s + (v - xMean) * (raw[i] - yMean), 0) /
      variance
    : 0
  const sse = raw.reduce(
    (s, v, i) => s + (v - yMean - slope * (index[i] - xMean)) ** 2,
    0
  )
  const slopeSe =
    index.length > 2 && variance
      ? Math.sqrt(sse / (index.length - 2) / variance)
      : 0
  if (minutes >= 60 && minutes + slope + 3 * slopeSe < 60 - 1e-8) return null
  return {
    direct,
    residual: Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length),
    maxError: Math.max(...errors.map(Math.abs)),
    tolerance,
    index,
  }
}
function sameTimeOfDay(times: number[]) {
  const minutes = times.map((t) => (t % DAY) / MINUTE)
  // Circular distance permits ordinary jitter across midnight.
  const anchor = minutes[0]
  const offsets = minutes.map((m) => ((m - anchor + 2160) % 1440) - 720)
  const center = median(offsets)
  return offsets.every((m) => Math.abs(m - center) <= 10)
}
function calendarFit(times: number[]): Fit | null {
  if (times.length < 3 || !sameTimeOfDay(times)) return null
  const dates = times.map((t) => new Date(t))
  const days = times.map((t) => Math.floor(t / DAY))
  if (new Set(days).size !== days.length) return null
  const monthIndex = dates.map((d) => d.getUTCFullYear() * 12 + d.getUTCMonth())
  const uniqueMonths = [...new Set(monthIndex)]
  const consecutiveMonths = uniqueMonths.every(
    (m, i) => i === 0 || m === uniqueMonths[i - 1] + 1
  )
  const dom = dates.map((d) => d.getUTCDate())
  const fromEnd = dates.map(
    (d) =>
      new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
      ).getUTCDate() - d.getUTCDate()
  )
  const range = (a: number[]) => Math.max(...a) - Math.min(...a)
  const byMonth = uniqueMonths.map((m) =>
    dates.filter((_, i) => monthIndex[i] === m)
  )
  if (
    uniqueMonths.length >= 3 &&
    consecutiveMonths &&
    byMonth.every((group) => group.length === 2)
  ) {
    const first = byMonth.map((group) => group[0].getUTCDate()),
      second = byMonth.map((group) => group[1].getUTCDate())
    if (
      range(first) <= 3 &&
      range(second) <= 3 &&
      second.every((d, i) => d - first[i] >= 7)
    )
      return {
        frequency: { kind: "twice-monthly" },
        detail: `Two recurring calendar positions in each of ${uniqueMonths.length} consecutive months; dates ${first.join("/")} and ${second.join("/")}.`,
        residual: 0,
        direct: times.length - 1,
        warnings: [
          "The exact twice-monthly calendar rule is inferred from limited history.",
        ],
      }
  }
  if (
    uniqueMonths.length === times.length &&
    times.length >= 3 &&
    consecutiveMonths
  ) {
    const ordinalWeek = dates.map((d) => Math.floor((d.getUTCDate() - 1) / 7))
    const sameOrdinalWeekday =
      new Set(ordinalWeek).size === 1 &&
      new Set(dates.map((d) => d.getUTCDay())).size === 1
    if (range(dom) <= 3 || range(fromEnd) <= 3 || sameOrdinalWeekday)
      return {
        frequency: { kind: "monthly" },
        detail: `One start in each of ${times.length} consecutive months at a consistent time and calendar position (day ${dom.join(", ")}).`,
        residual: 0,
        direct: times.length - 1,
        warnings: [
          "Monthly frequency is supported; the exact date, business-day, or month-end rule is uncertain.",
        ],
      }
  }
  const dayGaps = days.slice(1).map((d, i) => d - days[i])
  for (const [period, kind] of [
    [14, "fortnightly"],
    [7, "weekly"],
  ] as const) {
    const fit = lattice(times, period * 1440)
    if (fit && dayGaps.filter((d) => d === period).length >= 2)
      return {
        frequency: { kind },
        detail: `${times.length} starts fit a ${period}-day calendar pattern, with ${fit.direct} directly consecutive occurrences and at most ${round(fit.maxError)} minutes of timing variation.`,
        residual: fit.residual,
        direct: fit.direct,
        warnings: [],
      }
  }
  const weekdays = dates.every((d) => d.getUTCDay() >= 1 && d.getUTCDay() <= 5)
  const observedWeekendGaps = dayGaps.filter(
    (gap, i) =>
      gap === 3 && dates[i].getUTCDay() === 5 && dates[i + 1].getUTCDay() === 1
  ).length
  if (
    weekdays &&
    times.length >= 6 &&
    observedWeekendGaps >= 2 &&
    dayGaps.filter((d) => d === 1).length >= 3
  )
    return {
      frequency: { kind: "weekdays" },
      detail: `${times.length} starts share a daily time on weekdays; ${observedWeekendGaps} observed Friday-to-Monday gaps support a weekday calendar. Missing occurrences may remain.`,
      residual: 0,
      direct: dayGaps.filter((d) => d === 1).length,
      warnings: [],
    }
  const daily = lattice(times, 1440)
  if (daily && daily.direct >= 2)
    return {
      frequency: { kind: "daily" },
      detail: `${times.length} starts fit a daily time, with ${daily.direct} directly consecutive days and at most ${round(daily.maxError)} minutes of timing variation.`,
      residual: daily.residual,
      direct: daily.direct,
      warnings: [],
    }
  return null
}
function fixedFit(times: number[]): Fit | null {
  if (times.length < 8) return null
  const gaps = times.slice(1).map((t, i) => (t - times[i]) / MINUTE)
  const candidates = new Set([
    1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720, 2880,
  ])
  // Discover observed minute cadences without names or a fixed schedule list.
  // Multi-day intervals need the same direct evidence as intraday intervals.
  for (const gap of gaps) if (gap >= 1) candidates.add(Math.round(gap))
  const fits: Fit[] = []
  for (const minutes of candidates) {
    const fit = lattice(times, minutes)
    if (!fit || fit.direct < 6) continue
    const longGaps = gaps.filter((g) => g > minutes * 3 && g > 8 * 60)
    let windowText = ""
    if (minutes < 1440 && longGaps.length) {
      const counts = new Map<number, number>()
      times.forEach((t) => {
        const day = Math.floor(t / DAY)
        counts.set(day, (counts.get(day) ?? 0) + 1)
      })
      const repeatedWindows = [...counts.values()].filter(
        (count) => count >= 3
      ).length
      if (repeatedWindows < 2) continue
      windowText = ` ${repeatedWindows} days contain repeated activity windows; overnight or missing-occurrence gaps are retained.`
    }
    fits.push({
      frequency: { kind: "interval", minutes },
      detail: `${times.length} starts fit a ${minutes}-minute schedule, with ${fit.direct} directly consecutive intervals. Maximum phase variation ${round(fit.maxError)} minutes (allowed ${fit.tolerance}).${windowText}`,
      residual: fit.residual,
      direct: fit.direct,
      warnings: [],
    })
  }
  // Prefer the best fit to all observations, not the shortest individual gap.
  fits.sort((a, b) => a.residual - b.residual || b.direct - a.direct)
  return fits[0] ?? null
}
function fit(rows: RunRow[]): Fit | null {
  const times = rows.map((r) => r.startMs!)
  return calendarFit(times) ?? fixedFit(times)
}
function isFailure(row: RunRow) {
  return ["failed", "stopped", "aborted"].includes(row.status.toLowerCase())
}
function isSuccess(row: RunRow) {
  return ["succeeded", "success"].includes(row.status.toLowerCase())
}
function infer(valid: RunRow[]): { fit: Fit | null; rerunIds: string[] } {
  const fullFit = fit(valid)
  if (fullFit) return { fit: fullFit, rerunIds: [] }
  const possible = valid
    .flatMap((row, i) => {
      const prior = valid[i - 1]
      const delta = prior ? (row.startMs! - prior.startMs!) / MINUTE : 0
      return prior &&
        isSuccess(row) &&
        isFailure(prior) &&
        delta > 0 &&
        delta <= 1440
        ? [{ row, delta }]
        : []
    })
    .sort((a, b) => a.delta - b.delta)
  // A normal scheduled success can also follow a failure within 24 hours.
  // Test gap groups from shortest to longest rather than removing every linked
  // success up front; each proposed exclusion must leave a supported baseline.
  const excluded = new Set<string>()
  for (let i = 0; i < possible.length; i++) {
    excluded.add(possible[i].row.id)
    if (possible[i + 1]?.delta === possible[i].delta) continue
    if (excluded.size / valid.length > 0.25) break
    const baseline = valid.filter((r) => !excluded.has(r.id))
    if (baseline.length < 3 || baseline.length - excluded.size < 2) continue
    const baselineFit = fit(baseline)
    if (!baselineFit) continue
    const interval = expectedIntervalMinutes(baselineFit.frequency)!
    if (
      possible
        .slice(0, i + 1)
        .some(
          ({ delta }) =>
            delta > Math.min(1440, interval / 2) ||
            delta <= Math.min(10, interval * 0.2)
        )
    )
      continue
    return {
      fit: baselineFit,
      rerunIds: valid.filter((r) => excluded.has(r.id)).map((r) => r.id),
    }
  }
  return { fit: null, rerunIds: [] }
}
function analyzeWorkflow(
  name: string,
  rows: RunRow[],
  duplicateRows: number,
  latestTimestamp: number,
  sourceWarnings: string[]
): WorkflowResult {
  const valid = rows
    .filter((r) => r.validStart)
    .sort((a, b) => a.startMs! - b.startMs!)
  const invalidRows = rows.length - valid.length
  const firstStart = valid[0]?.startMs ?? null,
    lastStart = valid.at(-1)?.startMs ?? null
  const gapsMinutes = valid
    .slice(1)
    .map((row, i) => (row.startMs! - valid[i].startMs!) / MINUTE)
  const inference = invalidRows ? { fit: null, rerunIds: [] } : infer(valid)
  const frequency: Frequency = inference.fit?.frequency ?? { kind: "unknown" }
  const scope = scopeForFrequency(frequency)
  const reason = invalidRows
    ? `${invalidRows} invalid start timestamp${invalidRows === 1 ? " prevents" : "s prevent"} reliable frequency inference.`
    : inference.fit
      ? scope === "in-scope"
        ? `${frequencyLabel(frequency)} is hourly or less frequent.`
        : `${frequencyLabel(frequency)} is faster than hourly.`
      : valid.length < 3
        ? `Only ${valid.length} valid start${valid.length === 1 ? "" : "s"}; insufficient evidence of a recurring frequency.`
        : "No supported recurring schedule explains all starts; irregular activity or incomplete evidence needs an engineer."
  const interval = expectedIntervalMinutes(frequency)
  const inactivityDays = Math.max(30, (3 * (interval ?? 0)) / 1440)
  const ageDays = lastStart === null ? 0 : (latestTimestamp - lastStart) / DAY
  const possiblyInactive =
    interval !== null && lastStart !== null && ageDays > inactivityDays
  const warnings = [
    ...new Set([
      ...sourceWarnings,
      ...(inference.fit?.warnings ?? []),
      ...(inference.rerunIds.length
        ? [
            "Possible reruns are an assumption based on status and timing, not verified scheduler metadata.",
          ]
        : []),
      ...(possiblyInactive
        ? [
            `No observed start for ${round(ageDays)} days before the export's latest timestamp; possible inactivity is not retirement.`,
          ]
        : []),
    ]),
  ]
  const evidence: EvidenceStep[] = [
    {
      id: "input",
      title: invalidRows ? "Warning · Input checks" : "Complete · Input checks",
      status: invalidRows ? "warning" : "complete",
      detail: `${rows.length} unique source row${rows.length === 1 ? "" : "s"}; ${valid.length} usable start${valid.length === 1 ? "" : "s"}; ${duplicateRows} exact duplicate${duplicateRows === 1 ? "" : "s"} excluded; ${invalidRows} invalid start${invalidRows === 1 ? "" : "s"}. All statuses contribute. Missing end times are allowed.`,
      rowIds: rows.map((r) => r.id),
    },
    {
      id: "schedule",
      title: inference.fit
        ? "Complete · Detected schedule"
        : "Warning · Schedule unresolved",
      status: inference.fit ? "complete" : "warning",
      detail: inference.fit?.detail ?? reason,
      rowIds: valid
        .filter((r) => !inference.rerunIds.includes(r.id))
        .map((r) => r.id),
    },
    {
      id: "reruns",
      title: inference.rerunIds.length
        ? "Warning · Possible reruns"
        : "Complete · Possible reruns checked",
      status: inference.rerunIds.length ? "warning" : "complete",
      detail: inference.rerunIds.length
        ? `${inference.rerunIds.length} successful off-schedule starts immediately follow unsuccessful attempts within half the supported interval (maximum 24 hours). They are visible but excluded from schedule fitting; confirm this assumption.`
        : "No observations were excluded as possible reruns.",
      rowIds: inference.rerunIds,
    },
    {
      id: "uncertainty",
      title:
        warnings.length || frequency.kind === "unknown"
          ? "Warning · Remaining uncertainty"
          : "Complete · Evidence consistency",
      status:
        warnings.length || frequency.kind === "unknown"
          ? "warning"
          : "complete",
      detail:
        [...warnings, ...(frequency.kind === "unknown" ? [reason] : [])].join(
          " "
        ) ||
        "Every usable start supports the selected pattern. Missing history can still conceal a different scheduler configuration.",
      rowIds: [],
    },
    {
      id: "scope",
      title: "Complete · Scope rule applied",
      status: "complete",
      detail: `${reason} Rule: hourly or less frequent is in scope; faster or unresolved goes to an engineer.`,
      rowIds: [],
    },
  ]
  return {
    name,
    frequency,
    scope,
    reason,
    rows: [...valid, ...rows.filter((r) => !r.validStart)],
    validRuns: valid.length,
    firstStart,
    lastStart,
    coverageDays:
      firstStart === null || lastStart === null
        ? 0
        : (lastStart - firstStart) / DAY,
    gapsMinutes,
    rerunIds: inference.rerunIds,
    duplicateRows,
    invalidRows,
    possiblyInactive,
    evidence,
    warnings,
  }
}
export function analyzeCsv(text: string): DatasetAnalysis {
  const parsed = parseCsv(text),
    groups = new Map<string, RunRow[]>()
  for (const row of parsed.rows) {
    const group = groups.get(row.workflowName) ?? []
    group.push(row)
    groups.set(row.workflowName, group)
  }
  const starts = parsed.rows.flatMap((r) =>
    r.startMs === null ? [] : [r.startMs]
  )
  const latestTimestamp = starts.length
    ? starts.reduce((max, t) => Math.max(max, t), -Infinity)
    : null
  const results = [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, rows]) =>
      analyzeWorkflow(
        name,
        rows,
        parsed.duplicateRowsByWorkflow[name] ?? 0,
        latestTimestamp ?? 0,
        parsed.issues
          .filter(
            (i) =>
              i.workflowName === name &&
              i.severity === "warning" &&
              !i.message.startsWith("Exact duplicate")
          )
          .map((i) => `Line ${i.sourceLine}: ${i.message}`)
      )
    )
  return {
    results,
    totalRows: parsed.totalRows,
    validRows: starts.length,
    duplicateRows: parsed.duplicateRows,
    invalidRows: parsed.issues.filter((i) => i.severity === "error").length,
    issues: parsed.issues,
    latestTimestamp,
  }
}

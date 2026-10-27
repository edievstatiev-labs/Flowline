import type {
  DatasetAnalysis,
  RunRow,
  WorkflowResult,
} from "@/lib/engine/types"

const DAY = 86_400_000

export interface ExportedStartDay extends Record<string, unknown> {
  date: Date
  sourceDay: string
  sourceEndDay: string
  periodDays: number
  starts: number
}

/** Count observations, not scheduler executions. Parsed exact duplicates and
 * invalid starts are absent. UTC arithmetic preserves the source wall clock. */
export function exportedStartsByDay(
  analysis: DatasetAnalysis
): ExportedStartDay[] {
  const counts = new Map<number, number>()
  for (const workflow of analysis.results) {
    for (const row of workflow.rows) {
      if (!row.validStart || row.startMs === null) continue
      const day = Math.floor(row.startMs / DAY) * DAY
      counts.set(day, (counts.get(day) ?? 0) + 1)
    }
  }
  if (!counts.size) return []
  const days = [...counts.keys()]
  const first = days.reduce((min, day) => Math.min(min, day), Infinity)
  const last = days.reduce((max, day) => Math.max(max, day), -Infinity)
  const spanDays = (last - first) / DAY + 1
  // Bound the rendered data for unusual, very long uploads. Normal exports
  // retain one bucket per source day; longer spans use labeled periods.
  const periodDays = Math.max(1, Math.ceil(spanDays / 366))
  const periods = new Map<number, number>()
  for (const [day, count] of counts) {
    const period = Math.floor((day - first) / DAY / periodDays)
    periods.set(period, (periods.get(period) ?? 0) + count)
  }
  return Array.from(
    { length: Math.ceil(spanDays / periodDays) },
    (_, index) => {
      const day = first + index * periodDays * DAY
      const date = new Date(day)
      const endDate = new Date(Math.min(last, day + (periodDays - 1) * DAY))
      return {
        date,
        sourceDay: date.toISOString().slice(0, 10),
        sourceEndDay: endDate.toISOString().slice(0, 10),
        periodDays,
        starts: periods.get(index) ?? 0,
      }
    }
  )
}

export interface RunStartPoint extends Record<string, unknown> {
  date: Date
  sourceRow: RunRow
  success: number | null
  other: number | null
  possibleRerun: number | null
}

/** Separate visible series retain status and possible-retry evidence. */
export function observedRunPoints(workflow: WorkflowResult): RunStartPoint[] {
  const reruns = new Set(workflow.rerunIds)
  return workflow.rows
    .filter(
      (row): row is RunRow & { startMs: number } =>
        row.validStart && row.startMs !== null
    )
    .sort((a, b) => a.startMs - b.startMs)
    .map((row) => {
      const hour = (((row.startMs % DAY) + DAY) % DAY) / 3_600_000
      const rerun = reruns.has(row.id)
      const succeeded = /^(success|succeeded|successful)$/i.test(
        row.status.trim()
      )
      return {
        date: new Date(row.startMs),
        sourceRow: row,
        success: !rerun && succeeded ? hour : null,
        other: !rerun && !succeeded ? hour : null,
        possibleRerun: rerun ? hour : null,
      }
    })
}

export function sourceDateLabel(date: Date): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]}`
}

export function sourceHourLabel(value: number): string {
  const totalMinutes = Math.round(Math.abs(value) * 60)
  const sign = value < 0 ? "-" : ""
  return `${sign}${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`
}

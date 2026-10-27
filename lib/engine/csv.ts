import type { CsvIssue, ParsedCsv, RunRow } from "./types"

export class CsvError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CsvError"
  }
}

/** A timezone-free source timestamp is encoded as UTC solely for arithmetic.
 * Never format this value with the viewer's local timezone. Invalid calendar dates
 * are rejected rather than normalized by Date.parse. Explicit offsets are rejected
 * because mixing instant timestamps with source wall-clock values is ambiguous. */
export function parseWallClock(value: string): number | null {
  const m =
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(
      value.trim()
    )
  if (!m) return null
  const [y, mo, d, h, mi, s] = m.slice(1, 7).map((v) => Number(v ?? 0))
  if (
    y < 1000 ||
    mo < 1 ||
    mo > 12 ||
    d < 1 ||
    d > 31 ||
    h > 23 ||
    mi > 59 ||
    s > 59
  )
    return null
  const ms = Number((m[7] ?? "").padEnd(3, "0"))
  const timestamp = Date.UTC(y, mo - 1, d, h, mi, s, ms)
  const date = new Date(timestamp)
  return date.getUTCFullYear() === y &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d
    ? timestamp
    : null
}

export function formatWallClock(timestamp: number | null): string {
  return timestamp === null
    ? "—"
    : new Date(timestamp).toISOString().slice(0, 19).replace("T", " ")
}

/** RFC 4180-style fields, with strict quote handling and source physical line numbers. */
function records(text: string): { values: string[]; line: number }[] {
  const output: { values: string[]; line: number }[] = []
  let values: string[] = [],
    field = "",
    quoted = false,
    closed = false,
    line = 1,
    recordLine = 1
  const finish = () => {
    values.push(field)
    if (values.some((v) => v.trim() !== ""))
      output.push({ values, line: recordLine })
    values = []
    field = ""
    closed = false
  }
  const content = text.replace(/^\uFEFF/, "")
  for (let i = 0; i < content.length; i++) {
    const c = content[i]
    if (quoted) {
      if (c === '"' && content[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        quoted = false
        closed = true
      } else {
        field += c
        if (c === "\n") line++
      }
    } else if (c === '"') {
      if (field.length || closed)
        throw new CsvError(`Unexpected quote on line ${line}.`)
      quoted = true
    } else if (c === ",") {
      values.push(field)
      field = ""
      closed = false
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && content[i + 1] === "\n") i++
      finish()
      line++
      recordLine = line
    } else {
      if (closed && c.trim())
        throw new CsvError(
          `Unexpected character after a quoted field on line ${line}.`
        )
      if (!closed) field += c
    }
  }
  if (quoted)
    throw new CsvError(`Unclosed quoted field starting on line ${recordLine}.`)
  if (field.length || values.length || closed) finish()
  return output
}

export function parseCsv(text: string): ParsedCsv {
  if (text.length > 10 * 1024 * 1024)
    throw new CsvError("CSV exceeds the 10 MB prototype limit.")
  const all = records(text)
  if (all.length < 2)
    throw new CsvError("Provide a header and at least one run row.")
  const header = all[0].values.map((h) => h.trim().toLowerCase())
  if (new Set(header).size !== header.length)
    throw new CsvError("Duplicate column headers are not supported.")
  for (const name of ["workflow_name", "start_time", "end_time", "status"])
    if (!header.includes(name))
      throw new CsvError(`Missing required column: ${name}.`)
  const rows: RunRow[] = [],
    issues: CsvIssue[] = [],
    seen = new Set<string>()
  const duplicateRowsByWorkflow: Record<string, number> = Object.create(null)
  let duplicateRows = 0
  for (const record of all.slice(1)) {
    if (record.values.length !== header.length)
      throw new CsvError(
        `Line ${record.line} has ${record.values.length} fields; expected ${header.length}.`
      )
    const get = (name: string) => record.values[header.indexOf(name)].trim()
    const workflowName = get("workflow_name")
    if (!workflowName) {
      issues.push({
        sourceLine: record.line,
        message: "Missing workflow name; row cannot be assigned to a workflow.",
        severity: "error",
      })
      continue
    }
    const signature = JSON.stringify(record.values)
    if (seen.has(signature)) {
      duplicateRows++
      duplicateRowsByWorkflow[workflowName] =
        (duplicateRowsByWorkflow[workflowName] ?? 0) + 1
      issues.push({
        sourceLine: record.line,
        workflowName,
        message: "Exact duplicate row excluded.",
        severity: "warning",
      })
      continue
    }
    seen.add(signature)
    const startTime = get("start_time"),
      endTime = get("end_time"),
      status = get("status")
    const startMs = parseWallClock(startTime),
      endMs = endTime ? parseWallClock(endTime) : null
    if (startMs === null)
      issues.push({
        sourceLine: record.line,
        workflowName,
        message:
          "Invalid start_time; frequency cannot be trusted for this workflow.",
        severity: "error",
      })
    if (endTime && endMs === null)
      issues.push({
        sourceLine: record.line,
        workflowName,
        message: "Invalid end_time; start_time remains usable.",
        severity: "warning",
      })
    if (endMs !== null && startMs !== null && endMs < startMs)
      issues.push({
        sourceLine: record.line,
        workflowName,
        message:
          "end_time precedes start_time; frequency uses start_time only.",
        severity: "warning",
      })
    if (
      !["succeeded", "success", "failed", "stopped", "aborted"].includes(
        status.toLowerCase()
      )
    )
      issues.push({
        sourceLine: record.line,
        workflowName,
        message:
          "Unrecognized status; start included, but this row cannot establish a rerun.",
        severity: "warning",
      })
    rows.push({
      id: `row-${record.line}`,
      sourceLine: record.line,
      workflowName,
      startTime,
      endTime,
      startMs,
      endMs,
      status,
      validStart: startMs !== null,
    })
  }
  if (!rows.length) throw new CsvError("No rows can be assigned to a workflow.")
  return {
    rows,
    totalRows: all.length - 1,
    duplicateRows,
    duplicateRowsByWorkflow,
    issues,
  }
}

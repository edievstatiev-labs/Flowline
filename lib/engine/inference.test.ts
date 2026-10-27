import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { analyzeCsv, frequencyLabel, scopeForFrequency } from "./inference"
import { CsvError, parseCsv, parseWallClock } from "./csv"
import {
  applyCorrection,
  datasetFingerprint,
  exportResultsCsv,
  parseCorrections,
  serializeCorrections,
} from "./review"
import type { Correction, Frequency } from "./types"

const minute = 60_000,
  day = 1440 * minute,
  start = Date.UTC(2026, 6, 1, 7)
function timestamp(time: number) {
  return new Date(time).toISOString().slice(0, 19).replace("T", " ")
}
function csv(times: number[], statuses: string[] = [], name = "workflow") {
  return (
    "workflow_name,start_time,end_time,status\n" +
    times
      .map((t, i) => `${name},${timestamp(t)},,${statuses[i] ?? "Succeeded"}`)
      .join("\n")
  )
}
function periodic(count: number, minutes: number, jitter: number[] = []) {
  return Array.from(
    { length: count },
    (_, i) => start + (i * minutes + (jitter[i % jitter.length] ?? 0)) * minute
  )
}
const infer = (times: number[], statuses: string[] = []) =>
  analyzeCsv(csv(times, statuses)).results[0]
const source = readFileSync(
  new URL("./fixtures/run_history.csv", import.meta.url),
  "utf8"
)

describe("supplied export acceptance", () => {
  const analysis = analyzeCsv(source)
  const get = (name: string) =>
    analysis.results.find((result) => result.name === name)!
  it("retains exactly 40 workflows and all 1,152 runs", () => {
    expect(analysis.results).toHaveLength(40)
    expect(analysis.totalRows).toBe(1152)
    expect(analysis.validRows).toBe(1152)
    expect(analysis.invalidRows).toBe(0)
  })
  it("matches the independently reviewed cadence and scope for every supplied workflow", () => {
    // Reviewed against timestamp groups: recurring wall-clock time, weekdays,
    // month positions, intraday gaps, statuses and possible rerun pairs. Names
    // are identifiers, never cadence evidence (several deliberately disagree).
    const expected: Record<string, [string, "in-scope" | "engineer-review"]> = {
      wf_BILL_INVOICE_WEEKLY: ["Monthly", "in-scope"],
      wf_CRM_CONTACTS: ["Daily", "in-scope"],
      wf_DIM_CUSTOMER: ["Daily", "in-scope"],
      wf_DQ_ADHOC_RECON: ["Unknown", "engineer-review"],
      wf_ERP_JRNL_15MIN: ["Hourly", "in-scope"],
      wf_FIN_ACCRUALS_V2: ["Unknown", "engineer-review"],
      wf_FIN_AP_INVOICES: ["Weekdays", "in-scope"],
      wf_FIN_BUDGET_ACTUALS: ["Monthly", "in-scope"],
      wf_FIN_EXPENSES_SYNC: ["Every two weeks", "in-scope"],
      wf_FIN_FA_DEPRECIATION: ["Monthly", "in-scope"],
      wf_FIN_FX_REVAL_WEEKLY: ["Weekly", "in-scope"],
      wf_FIN_GL_DAILY_LOAD: ["Daily", "in-scope"],
      wf_FIN_INTERCO_RECON: ["Monthly", "in-scope"],
      wf_FIN_JRNL_REPOST: ["Unknown", "engineer-review"],
      wf_FIN_MONTH_END_CLOSE: ["Monthly", "in-scope"],
      wf_FIN_QTR_REG_RPT: ["Unknown", "engineer-review"],
      wf_HR_ABSENCE_FEED: ["Daily", "in-scope"],
      wf_HR_PAYROLL_MONTHLY: ["Monthly", "in-scope"],
      wf_HR_PENSION_EXTRACT: ["Monthly", "in-scope"],
      wf_HR_TIMESHEETS_FN: ["Every two weeks", "in-scope"],
      wf_INV_STOCK_HOURLY: ["Daily", "in-scope"],
      wf_LEGACY_SFTP_PULL: ["Weekly", "in-scope"],
      wf_MDM_PRODUCT_MERGE: ["Unknown", "engineer-review"],
      wf_MKT_CAMPAIGNS: ["Daily", "in-scope"],
      wf_MKT_GDPR_PURGE: ["Monthly", "in-scope"],
      wf_MKT_SEGMENT_REBUILD: ["Weekly", "in-scope"],
      wf_OPS_LOG_ARCHIVE: ["Weekly", "in-scope"],
      wf_PAY_AUTH_HOURLY: ["Every 30 minutes", "engineer-review"],
      wf_PROC_SUPPLIER_DAILY: ["Weekly", "in-scope"],
      wf_RISK_EXPOSURE_WKLY: ["Weekly", "in-scope"],
      wf_RISK_PNL_DAILY: ["Every 30 minutes", "engineer-review"],
      wf_SLS_COMMISSIONS: ["Twice monthly", "in-scope"],
      wf_SLS_ORDERS_INCR: ["Daily", "in-scope"],
      wf_SLS_PIPELINE: ["Weekdays", "in-scope"],
      wf_SLS_TERRITORY_LOAD: ["Monthly", "in-scope"],
      wf_TAX_VAT_EXTRACT: ["Monthly", "in-scope"],
      wf_TRD_POSITIONS: ["Every 15 minutes", "engineer-review"],
      wf_TRSY_CASH_DAILY: ["Weekdays", "in-scope"],
      wf_WEB_CLICKS: ["Hourly", "in-scope"],
      wf_WMS_SHIPMENTS: ["Daily", "in-scope"],
    }
    const actual = Object.fromEntries(
      analysis.results.map((result) => [
        result.name,
        [frequencyLabel(result.frequency), result.scope],
      ])
    )
    expect(Object.keys(expected)).toHaveLength(40)
    expect(actual).toEqual(expected)
  })
  it("identifies daily orders with two possible reruns", () => {
    const result = get("wf_SLS_ORDERS_INCR")
    expect(result.frequency.kind).toBe("daily")
    expect(result.scope).toBe("in-scope")
    expect(result.rerunIds).toHaveLength(2)
  })
  it("accepts hourly jitter rather than classifying the shortest gap", () => {
    const result = get("wf_WEB_CLICKS")
    expect(Math.min(...result.gapsMinutes)).toBeLessThan(53)
    expect(result.frequency).toEqual({ kind: "interval", minutes: 60 })
    expect(result.scope).toBe("in-scope")
  })
  it("ignores misleading hourly and 15MIN names", () => {
    expect(get("wf_PAY_AUTH_HOURLY").frequency).toEqual({
      kind: "interval",
      minutes: 30,
    })
    expect(get("wf_PAY_AUTH_HOURLY").scope).toBe("engineer-review")
    expect(get("wf_ERP_JRNL_15MIN").frequency).toEqual({
      kind: "interval",
      minutes: 60,
    })
  })
  it("recognizes monthly calendar positions despite changing month length", () => {
    expect(get("wf_FIN_MONTH_END_CLOSE").frequency.kind).toBe("monthly")
    expect(get("wf_FIN_MONTH_END_CLOSE").scope).toBe("in-scope")
    expect(get("wf_FIN_MONTH_END_CLOSE").warnings.join()).toContain("exact")
  })
  it("does not manufacture quarterly frequency from a single start", () => {
    expect(get("wf_FIN_QTR_REG_RPT").frequency.kind).toBe("unknown")
    expect(get("wf_FIN_QTR_REG_RPT").scope).toBe("engineer-review")
    expect(get("wf_FIN_QTR_REG_RPT").possiblyInactive).toBe(false)
  })
  it("uses all statuses and permits missing end times", () => {
    expect(get("wf_LEGACY_SFTP_PULL").frequency.kind).toBe("weekly")
    expect(
      analysis.results.flatMap((r) => r.rows).filter((r) => r.endTime === "")
    ).toHaveLength(4)
  })
  it("recognizes fortnightly and twice-monthly calendars separately", () => {
    expect(get("wf_HR_TIMESHEETS_FN").frequency.kind).toBe("fortnightly")
    expect(get("wf_FIN_EXPENSES_SYNC").frequency.kind).toBe("fortnightly")
    expect(get("wf_SLS_COMMISSIONS").frequency.kind).toBe("twice-monthly")
  })
  it("recognizes weekday gaps and a newly introduced daily workflow", () => {
    expect(get("wf_FIN_AP_INVOICES").frequency.kind).toBe("weekdays")
    expect(get("wf_HR_ABSENCE_FEED").frequency.kind).toBe("daily")
  })
  it("handles a daily rerun that crosses midnight", () => {
    const result = get("wf_INV_STOCK_HOURLY")
    expect(result.frequency.kind).toBe("daily")
    expect(result.rerunIds).toHaveLength(1)
  })
  it("flags possible inactivity without removing scope", () => {
    expect(get("wf_MKT_CAMPAIGNS").possiblyInactive).toBe(true)
    expect(get("wf_MKT_CAMPAIGNS").scope).toBe("in-scope")
  })
  it("routes irregular histories to an engineer", () => {
    for (const name of [
      "wf_DQ_ADHOC_RECON",
      "wf_FIN_JRNL_REPOST",
      "wf_MDM_PRODUCT_MERGE",
      "wf_FIN_ACCRUALS_V2",
    ]) {
      expect(get(name).frequency.kind).toBe("unknown")
      expect(get(name).scope).toBe("engineer-review")
    }
  })
  it("explains the actual input, schedule, reruns, uncertainty and scope", () => {
    for (const result of analysis.results) {
      expect(result.evidence.map((step) => step.id)).toEqual([
        "input",
        "schedule",
        "reruns",
        "uncertainty",
        "scope",
      ])
      for (const step of result.evidence)
        expect(
          step.rowIds.every((id) => result.rows.some((row) => row.id === id))
        ).toBe(true)
    }
  })
})

describe("inference boundaries", () => {
  it("includes exactly 60 minutes and excludes exactly 59", () => {
    expect(infer(periodic(8, 60)).scope).toBe("in-scope")
    expect(infer(periodic(8, 59)).frequency).toEqual({
      kind: "interval",
      minutes: 59,
    })
    expect(infer(periodic(8, 59)).scope).toBe("engineer-review")
  })
  it("does not round cumulative 59-minute drift into hourly", () => {
    expect(infer(periodic(72, 59)).frequency).toEqual({
      kind: "interval",
      minutes: 59,
    })
  })
  it("does not include fractional cadences just below hourly", () => {
    for (const minutes of [59.5, 59.8, 59.95, 59.99, 59 + 59 / 60])
      expect(infer(periodic(24, minutes)).scope).toBe("engineer-review")
  })
  it("does not hide subhour drift by selecting a slower nearby candidate", () => {
    const times = periodic(12, 59.8)
    times[11] += minute
    expect(infer(times).scope).toBe("engineer-review")
  })
  it("does not automatically include a change from hourly to 59.9 minutes", () => {
    const times = Array.from(
      { length: 24 },
      (_, i) =>
        start + (Math.min(i, 11) * 60 + Math.max(0, i - 11) * 59.9) * minute
    )
    expect(infer(times).scope).toBe("engineer-review")
  })
  it("requires eight starts and six directly consecutive fixed intervals", () => {
    expect(infer(periodic(7, 60)).frequency.kind).toBe("unknown")
    expect(infer(periodic(8, 60)).frequency.kind).toBe("interval")
    expect(
      infer([0, 1, 3, 4, 6, 7, 9, 11].map((i) => start + i * 60 * minute))
        .frequency.kind
    ).toBe("unknown")
  })
  it("retains missing occurrences when sufficient direct evidence exists", () => {
    expect(infer(periodic(16, 60).filter((_, i) => i !== 9)).frequency).toEqual(
      { kind: "interval", minutes: 60 }
    )
  })
  it("supports a directly observed fixed interval longer than a day without a special candidate", () => {
    const result = infer(periodic(10, 4320))
    expect(result.frequency).toEqual({ kind: "interval", minutes: 4320 })
    expect(result.scope).toBe("in-scope")
  })
  it("supports repeated daily activity windows", () => {
    const times = [0, 1].flatMap((d) =>
      periodic(12, 30).map((t) => t + d * day)
    )
    expect(infer(times).frequency).toEqual({ kind: "interval", minutes: 30 })
  })
  it("does not extrapolate one activity window from a later isolated start", () => {
    expect(infer([...periodic(12, 30), start + 3 * day]).frequency.kind).toBe(
      "unknown"
    )
  })
  it("never calls alternating failed and successful frequent runs reruns", () => {
    const result = infer(
      periodic(24, 30),
      Array.from({ length: 24 }, (_, i) => (i % 2 ? "Succeeded" : "Failed"))
    )
    expect(result.frequency).toEqual({ kind: "interval", minutes: 30 })
    expect(result.rerunIds).toHaveLength(0)
  })
  it("does not confuse a normal daily success after failure with a separate manual rerun", () => {
    const runs = periodic(12, 1440).map((time, i) => ({
      time,
      status: i === 2 || i === 7 ? "Failed" : "Succeeded",
    }))
    runs.push({ time: start + 2 * day + 40 * minute, status: "Succeeded" })
    runs.sort((a, b) => a.time - b.time)
    const result = infer(
      runs.map((run) => run.time),
      runs.map((run) => run.status)
    )
    expect(result.frequency.kind).toBe("daily")
    expect(result.rerunIds).toHaveLength(1)
    expect(result.scope).toBe("in-scope")
  })
  it("does not count normal next-day successes toward the 25% possible-rerun limit", () => {
    const runs = periodic(12, 1440).map((time, i) => ({
      time,
      status: [0, 3, 6, 9].includes(i) ? "Failed" : "Succeeded",
    }))
    runs.push({ time: start + 40 * minute, status: "Succeeded" })
    runs.sort((a, b) => a.time - b.time)
    const result = infer(
      runs.map((run) => run.time),
      runs.map((run) => run.status)
    )
    expect(result.frequency.kind).toBe("daily")
    expect(result.rerunIds).toHaveLength(1)
  })
  it("supports differently delayed reruns while retaining later scheduled successes", () => {
    const runs = periodic(12, 1440).map((time, i) => ({
      time,
      status: [2, 5, 8].includes(i) ? "Failed" : "Succeeded",
    }))
    runs.push(
      { time: start + 2 * day + 30 * minute, status: "Succeeded" },
      { time: start + 5 * day + 70 * minute, status: "Succeeded" }
    )
    runs.sort((a, b) => a.time - b.time)
    const result = infer(
      runs.map((run) => run.time),
      runs.map((run) => run.status)
    )
    expect(result.frequency.kind).toBe("daily")
    expect(result.rerunIds).toHaveLength(2)
  })
  it("permits a supported weekly rerun delayed beyond half a day but not beyond 24 hours", () => {
    const runs = periodic(5, 10080).map((time, i) => ({
      time,
      status: i === 2 ? "Failed" : "Succeeded",
    }))
    runs.push({
      time: start + 14 * day + 20 * 60 * minute,
      status: "Succeeded",
    })
    runs.sort((a, b) => a.time - b.time)
    const result = infer(
      runs.map((run) => run.time),
      runs.map((run) => run.status)
    )
    expect(result.frequency.kind).toBe("weekly")
    expect(result.rerunIds).toHaveLength(1)
    const late = [...runs]
    late[3] = { ...late[3], time: start + 15 * day + minute }
    expect(
      infer(
        late.map((run) => run.time),
        late.map((run) => run.status)
      ).frequency.kind
    ).toBe("unknown")
  })
  it("keeps unexplained extra successful starts as contradictions", () => {
    const result = infer(
      [...periodic(12, 1440), start + 3 * day + 40 * minute].sort(
        (a, b) => a - b
      )
    )
    expect(result.frequency.kind).toBe("unknown")
  })
  it("does not exclude more than 25% of observations as reruns", () => {
    const times = [0, 1, 2].flatMap((d) => [
      start + d * day,
      start + d * day + 40 * minute,
    ])
    expect(
      infer(times, [
        "Failed",
        "Succeeded",
        "Failed",
        "Succeeded",
        "Failed",
        "Succeeded",
      ]).frequency.kind
    ).toBe("unknown")
  })
  it("treats a fully failed weekly history as scheduling evidence", () => {
    expect(
      infer(periodic(4, 10080), ["Failed", "Failed", "Failed", "Failed"])
        .frequency.kind
    ).toBe("weekly")
  })
  it("requires three consecutive months for monthly detection", () => {
    const times = [
      Date.UTC(2026, 5, 30, 20),
      Date.UTC(2026, 6, 31, 20),
      Date.UTC(2026, 7, 31, 20),
    ]
    expect(infer(times).frequency.kind).toBe("monthly")
    expect(infer(times.slice(0, 2)).frequency.kind).toBe("unknown")
  })
  it("does not infer monthly from arbitrary dates in consecutive months", () => {
    expect(
      infer([
        Date.UTC(2026, 5, 1),
        Date.UTC(2026, 6, 12),
        Date.UTC(2026, 7, 23),
      ]).frequency.kind
    ).toBe("unknown")
  })
})

describe("CSV and literal source timestamps", () => {
  it("handles BOM, CRLF, quoted commas, doubled quotes and quoted newlines", () => {
    const text =
      '\uFEFFworkflow_name,start_time,end_time,status\r\n"a, ""quoted""\nname",2026-01-01 01:00:00,,Succeeded\r\n'
    const parsed = parseCsv(text)
    expect(parsed.rows[0].workflowName).toBe('a, "quoted"\nname')
    expect(parsed.rows[0].sourceLine).toBe(2)
  })
  it("rejects malformed schema and malformed quoting", () => {
    for (const text of [
      "wrong,start_time\na,b",
      "workflow_name,start_time,end_time,status\na,b,c",
      'workflow_name,start_time,end_time,status\n"broken,a,b,c',
      "workflow_name,start_time,start_time,status\na,b,c,d",
    ])
      expect(() => parseCsv(text)).toThrow(CsvError)
  })
  it("deduplicates exact rows but retains different status at the same timestamp", () => {
    const source = csv(periodic(8, 60))
    const first = source.split("\n")[1]
    const duplicate = analyzeCsv(source + "\n" + first)
    expect(duplicate.duplicateRows).toBe(1)
    expect(duplicate.results[0].validRuns).toBe(8)
    expect(duplicate.results[0].scope).toBe("in-scope")
    const distinct = analyzeCsv(
      source + "\n" + first.replace("Succeeded", "Failed")
    )
    expect(distinct.duplicateRows).toBe(0)
    expect(distinct.results[0].frequency.kind).toBe("unknown")
  })
  it("handles workflow names that collide with Object prototype properties", () => {
    for (const name of ["constructor", "toString", "__proto__"]) {
      const source = csv(periodic(8, 60), [], name)
      const result = analyzeCsv(source + "\n" + source.split("\n")[1])
        .results[0]
      expect(result.name).toBe(name)
      expect(result.duplicateRows).toBe(1)
      expect(result.scope).toBe("in-scope")
    }
  })
  it("keeps workflow-associated invalid starts and blocks automatic inclusion", () => {
    const result = analyzeCsv(
      csv(periodic(9, 60)) + "\nworkflow,2026-02-30 10:00:00,,Succeeded"
    )
    expect(result.results[0].invalidRows).toBe(1)
    expect(result.results[0].scope).toBe("engineer-review")
    expect(result.results[0].frequency.kind).toBe("unknown")
  })
  it("reports rows with missing workflow names without making up identifiers", () => {
    const result = analyzeCsv(
      csv(periodic(8, 60)) + "\n,2026-07-01 10:00:00,,Succeeded"
    )
    expect(result.invalidRows).toBe(1)
    expect(result.results).toHaveLength(1)
  })
  it("rejects normalized overflow dates and timezone mixing", () => {
    expect(parseWallClock("2026-02-30 01:00:00")).toBeNull()
    expect(parseWallClock("2026-01-01 24:00:00")).toBeNull()
    expect(parseWallClock("2026-01-01T01:00:00Z")).toBeNull()
    expect(parseWallClock("2026-01-01 01:00:00")).toBe(Date.UTC(2026, 0, 1, 1))
  })
  it("accepts leap dates and missing end times", () => {
    expect(parseWallClock("2024-02-29 23:59:59")).not.toBeNull()
    expect(
      parseCsv(csv(periodic(8, 60))).rows.every((r) => r.endMs === null)
    ).toBe(true)
  })
})

describe("corrections, persistence and export", () => {
  const result = infer(periodic(8, 30))
  const correction: Correction = {
    frequency: { kind: "daily" },
    reason: "Confirmed in the scheduler configuration.",
    updatedAt: "2026-10-27T10:00:00.000Z",
  }
  it("derives scope from correction without modifying the inference", () => {
    const effective = applyCorrection(result, correction)
    expect(effective.scope).toBe("in-scope")
    expect(result.scope).toBe("engineer-review")
    expect(effective.original.frequency).toEqual({
      kind: "interval",
      minutes: 30,
    })
    expect(applyCorrection(result).frequency).toEqual(result.frequency)
  })
  it("requires a reason and finite positive frequency", () => {
    expect(() =>
      applyCorrection(result, { ...correction, reason: " " })
    ).toThrow()
    expect(() =>
      applyCorrection(result, {
        ...correction,
        frequency: { kind: "interval", minutes: 0 },
      })
    ).toThrow()
    expect(() =>
      applyCorrection(result, {
        ...correction,
        frequency: { kind: "interval", minutes: NaN },
      })
    ).toThrow()
  })
  it("validates and round-trips browser storage", () => {
    expect(
      parseCorrections(serializeCorrections({ workflow: correction }))
    ).toEqual({ workflow: correction })
    expect(parseCorrections(null)).toEqual({})
    expect(() => parseCorrections("{")).toThrow()
    expect(() =>
      parseCorrections(
        '{"workflow":{"frequency":{"kind":"daily"},"reason":"x"}}'
      )
    ).toThrow()
  })
  it("isolates datasets with SHA-256 fingerprints", async () => {
    const a = csv(periodic(8, 60))
    expect(await datasetFingerprint(a)).toHaveLength(64)
    expect(await datasetFingerprint(a)).toBe(await datasetFingerprint(a))
    expect(await datasetFingerprint(a)).not.toBe(
      await datasetFingerprint(a.replace("Succeeded", "Failed"))
    )
  })
  it("exports original and effective decisions, reason and audit timestamp", () => {
    const exported = exportResultsCsv([result], { workflow: correction })
    expect(exported).toContain("original_frequency")
    expect(exported).toContain("Every 30 minutes")
    expect(exported).toContain("Daily")
    expect(exported).toContain(correction.reason)
    expect(exported).toContain(correction.updatedAt)
  })
  it("escapes CSV formulas and quotes in user-controlled values", () => {
    const exported = exportResultsCsv([{ ...result, name: "=SUM(1,2)" }], {
      "=SUM(1,2)": { ...correction, reason: '=HYPERLINK("evil")' },
    })
    expect(exported).toContain("'=SUM(1,2)")
    expect(exported).toContain('\'=HYPERLINK(""evil"")')
  })
  it("uses the fixed scope rule for every known calendar kind", () => {
    for (const kind of [
      "daily",
      "weekdays",
      "weekly",
      "fortnightly",
      "twice-monthly",
      "monthly",
    ] as const)
      expect(scopeForFrequency({ kind })).toBe("in-scope")
    expect(scopeForFrequency({ kind: "unknown" })).toBe("engineer-review")
    expect(frequencyLabel({ kind: "interval", minutes: 60 })).toBe("Hourly")
  })
})

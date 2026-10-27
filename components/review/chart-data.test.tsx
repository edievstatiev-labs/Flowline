import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { analyzeCsv } from "@/lib/engine/inference"
import {
  exportedStartsByDay,
  observedRunPoints,
  sourceDateLabel,
  sourceHourLabel,
} from "./chart-data"

const header = "workflow_name,start_time,end_time,status\n"

describe("Chart evidence from parsed source data", () => {
  it("formats fractional source-hour ticks without hiding an invalid chart domain", () => {
    expect(sourceHourLabel(4.8)).toBe("04:48")
    expect(sourceHourLabel(24)).toBe("24:00")
    expect(sourceHourLabel(100)).toBe("100:00")
  })

  it("counts the complete sample across its 90 source dates without dropping failed starts", () => {
    const source = readFileSync(
      new URL("../../lib/engine/fixtures/run_history.csv", import.meta.url),
      "utf8"
    )
    const analysis = analyzeCsv(source)
    const bins = exportedStartsByDay(analysis)
    expect(bins).toHaveLength(90)
    expect(bins[0].sourceDay).toBe("2026-06-29")
    expect(bins.at(-1)?.sourceDay).toBe("2026-09-26")
    expect(bins.reduce((total, bin) => total + bin.starts, 0)).toBe(1152)
  })

  it("retains empty source dates while excluding duplicates and invalid starts", () => {
    const source =
      header +
      [
        "night,2026-01-01 23:59:00,,Failed",
        "night,2026-01-01 23:59:00,,Failed",
        "night,2026-01-03 00:01:00,,Aborted",
        "other,invalid,,Succeeded",
      ].join("\n")
    const analysis = analyzeCsv(source)
    const bins = exportedStartsByDay(analysis)
    expect(analysis.duplicateRows).toBe(1)
    expect(analysis.invalidRows).toBe(1)
    expect(bins.map((bin) => [bin.sourceDay, bin.starts])).toEqual([
      ["2026-01-01", 1],
      ["2026-01-02", 0],
      ["2026-01-03", 1],
    ])
    expect(sourceDateLabel(bins[0].date)).toBe("1 Jan")
  })

  it("bounds long-range uploads without dropping observations or confusing source dates", () => {
    const analysis = analyzeCsv(
      header +
        [
          "old,1900-01-01 00:00:00,,Failed",
          "new,9999-12-31 23:59:00,,Succeeded",
        ].join("\n")
    )
    const bins = exportedStartsByDay(analysis)
    expect(bins.length).toBeLessThanOrEqual(366)
    expect(bins[0].sourceDay).toBe("1900-01-01")
    expect(bins.at(-1)?.sourceEndDay).toBe("9999-12-31")
    expect(bins[0].periodDays).toBeGreaterThan(1)
    expect(bins.reduce((total, bin) => total + bin.starts, 0)).toBe(2)
  })

  it("does not invent a date range when every start is invalid", () => {
    expect(
      exportedStartsByDay(analyzeCsv(header + "workflow,invalid,,Failed"))
    ).toEqual([])
  })

  it("keeps an after-midnight possible retry as its exact source time and a separate chart series", () => {
    const source = readFileSync(
      new URL("../../lib/engine/fixtures/run_history.csv", import.meta.url),
      "utf8"
    )
    const workflow = analyzeCsv(source).results.find(
      (result) => result.name === "wf_INV_STOCK_HOURLY"
    )!
    const points = observedRunPoints(workflow)
    const retry = points.find((point) =>
      workflow.rerunIds.includes(point.sourceRow.id)
    )!
    expect(points).toHaveLength(91)
    expect(retry.date.toISOString().slice(0, 19).replace("T", " ")).toBe(
      retry.sourceRow.startTime
    )
    expect(retry.possibleRerun).not.toBeNull()
    expect(retry.possibleRerun!).toBeLessThan(1)
    expect(retry.success).toBeNull()
    expect(retry.other).toBeNull()
    expect(points.filter((point) => point.other !== null)).toHaveLength(1)
  })
})

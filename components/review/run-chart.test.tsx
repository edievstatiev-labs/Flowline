// @vitest-environment jsdom
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { MotionConfig } from "motion/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { analyzeCsv } from "@/lib/engine/inference"
import { RunChart } from "./run-chart"

const workflow = analyzeCsv(
  "workflow_name,start_time,end_time,status\na,2026-07-01 23:59:40,,Failed\na,2026-07-02 00:01:20,,Succeeded\na,2026-07-03 01:25:10.125,,Succeeded"
).results[0]

describe("Run inspector evidence", () => {
  let container: HTMLDivElement
  let root: Root
  const onSelect = vi.fn()
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
      }))
    )
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      }
    )
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(700)
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(260)
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
    onSelect.mockClear()
  })
  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
  async function render() {
    await act(async () =>
      root.render(
        <MotionConfig reducedMotion="always">
          <RunChart workflow={workflow} onSelectRun={onSelect} />
        </MotionConfig>
      )
    )
  }
  it("keeps source-clock dates, fractional seconds and the exact source-row link through keyboard navigation", async () => {
    await render()
    const plot = container.querySelector('[role="group"]')!
    await act(async () =>
      plot.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      )
    )
    expect(
      container.querySelector(".selected-run-details")!.textContent
    ).toContain("2 Jul 2026")
    expect(
      container.querySelector(".selected-run-details")!.textContent
    ).toContain("00:01:20")
    await act(async () =>
      plot.dispatchEvent(
        new KeyboardEvent("keydown", { key: "End", bubbles: true })
      )
    )
    expect(
      container.querySelector(".selected-run-details")!.textContent
    ).toContain("01:25:10.125")
    const source = container.querySelector<HTMLButtonElement>(
      'button[aria-label="View source row 4"]'
    )!
    expect(source).not.toBeNull()
    await act(async () => source.click())
    expect(onSelect).toHaveBeenCalledWith(workflow.rows[2].id)
    expect(container.querySelector(".run-chart-legend")!.textContent).toContain(
      "Other status"
    )
  })
  it("reveals secondary gap evidence through the details disclosure", async () => {
    await render()
    const details = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Chart details"]'
    )!
    expect(details.getAttribute("aria-expanded")).toBe("false")
    await act(async () => details.click())
    expect(details.getAttribute("aria-expanded")).toBe("true")
    expect(container.querySelector(".gap-statistics")!.textContent).toContain(
      "1.7 min"
    )
    expect(container.querySelector(".run-chart-info")!.textContent).toContain(
      "do not establish the schedule"
    )
  })
})

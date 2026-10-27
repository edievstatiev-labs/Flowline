// @vitest-environment jsdom
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { MotionConfig } from "motion/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { analyzeCsv } from "@/lib/engine/inference"
import { OverviewCharts } from "./overview-charts"

const analysis = analyzeCsv(
  "workflow_name,start_time,end_time,status\na,2026-07-01 08:00:00,,Succeeded\na,2026-07-02 08:00:00,,Failed"
)

describe("Linked Bklit overview", () => {
  let container: HTMLDivElement
  let root: Root
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
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
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(400)
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(124)
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
  })
  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
  async function render(twice = false) {
    await act(async () =>
      root.render(
        <MotionConfig reducedMotion="always">
          <OverviewCharts analysis={analysis} inScope={32} engineerReview={8} />
          {twice && (
            <OverviewCharts
              analysis={analysis}
              inScope={32}
              engineerReview={8}
            />
          )}
        </MotionConfig>
      )
    )
  }
  it("links keyboard legend preview to the donut center and restores the total on blur", async () => {
    await render()
    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Engineer review: 8 workflows, 20%"]'
    )!
    expect(button).not.toBeNull()
    await act(async () => button.focus())
    expect(button.getAttribute("aria-pressed")).toBe("true")
    expect(container.querySelector(".scope-center-value")!.textContent).toBe(
      "8"
    )
    expect(container.querySelector(".scope-center-label")!.textContent).toBe(
      "Engineer review"
    )
    await act(async () => button.blur())
    expect(container.querySelector(".scope-center-value")!.textContent).toBe(
      "40"
    )
    expect(container.querySelector(".scope-center-label")!.textContent).toBe(
      "Workflows"
    )
  })
  it("links actual slice hover back to the matching legend row and center", async () => {
    await render()
    const slice = container.querySelector(
      '.scope-donut path[fill="transparent"]'
    )!
    expect(slice).not.toBeNull()
    await act(async () =>
      slice.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))
    )
    const button = container.querySelector(
      'button[aria-label="In scope: 32 workflows, 80%"]'
    )!
    expect(button.getAttribute("aria-pressed")).toBe("true")
    expect(container.querySelector(".scope-center-value")!.textContent).toBe(
      "32"
    )
    expect(button.closest("[data-hovered]")).not.toBeNull()
    await act(async () =>
      slice.dispatchEvent(
        new MouseEvent("mouseout", { bubbles: true, relatedTarget: container })
      )
    )
    expect(container.querySelector(".scope-center-value")!.textContent).toBe(
      "40"
    )
  })
  it("keeps gradient and mask ids unique when two overviews share a page", async () => {
    await render(true)
    const ids = [
      ...container.querySelectorAll("linearGradient[id], mask[id]"),
    ].map((node) => node.id)
    expect(ids.length).toBeGreaterThan(2)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

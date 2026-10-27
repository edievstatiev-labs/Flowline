// @vitest-environment jsdom

import { act, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { MotionConfig } from "motion/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Drawer } from "@/components/beui/drawer"

function ReviewHarness() {
  const [open, setOpen] = useState(false)
  return (
    <MotionConfig reducedMotion="always">
      <button type="button" onClick={() => setOpen(true)}>
        Open workflow
      </button>
      <button type="button">Another workflow</button>
      <Drawer open={open} onOpenChange={setOpen} ariaLabel="Workflow details">
        <button type="button" onClick={() => setOpen(false)}>
          Close details
        </button>
        <a href="#source-runs">Inspect source runs</a>
        <label>
          Correction reason
          <input />
        </label>
      </Drawer>
    </MotionConfig>
  )
}

describe("BeUI workflow drawer keyboard and scroll behavior", () => {
  let container: HTMLDivElement
  let root: Root | undefined
  let originalOverflow: string

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    )
    // jsdom has no layout engine: give visible controls a non-empty rectangle.
    // Focus trapping, presence, keyboard handlers and focus() remain real.
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(
      function () {
        return [new DOMRect(0, 0, 100, 30)] as unknown as DOMRectList
      }
    )
    originalOverflow = document.body.style.overflow
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
    await act(async () => root?.render(<ReviewHarness />))
  })

  afterEach(async () => {
    if (root) await act(async () => root?.unmount())
    root = undefined
    container.remove()
    document.body.style.overflow = originalOverflow
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const button = (label: string) =>
    Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
      (element) => element.textContent === label
    )!
  const dialog = () => container.querySelector<HTMLElement>('[role="dialog"]')!
  async function openDrawer() {
    const opener = button("Open workflow")
    opener.focus()
    await act(async () => opener.click())
    return opener
  }
  async function key(key: string, shiftKey = false) {
    const event = new KeyboardEvent("keydown", {
      key,
      shiftKey,
      bubbles: true,
      cancelable: true,
    })
    await act(async () => document.activeElement?.dispatchEvent(event))
    return event
  }

  it("moves focus into the named modal and prevents background scrolling", async () => {
    document.body.style.overflow = "scroll"
    await openDrawer()
    expect(dialog().getAttribute("aria-label")).toBe("Workflow details")
    expect(dialog().getAttribute("aria-modal")).toBe("true")
    expect(document.activeElement).toBe(button("Close details"))
    expect(document.body.style.overflow).toBe("hidden")
  })

  it("wraps Tab and Shift+Tab within the drawer", async () => {
    await openDrawer()
    const first = button("Close details")
    const last = dialog().querySelector<HTMLInputElement>("input")!
    last.focus()
    expect(document.activeElement).toBe(last)
    expect((await key("Tab")).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(first)
    expect((await key("Tab", true)).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(last)
  })

  it("redirects stray focus from the background into the open drawer", async () => {
    await openDrawer()
    await act(async () => button("Another workflow").focus())
    expect(document.activeElement).toBe(button("Close details"))
  })

  it("Escape releases the modal immediately, restores scroll and returns focus to its opener", async () => {
    document.body.style.overflow = "auto"
    const opener = await openDrawer()
    expect((await key("Escape")).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(opener)
    expect(document.body.style.overflow).toBe("auto")
    // Motion may retain an exiting visual; it must already be inert.
    const exiting = container.querySelector('[role="dialog"]')
    expect(exiting === null || exiting.hasAttribute("inert")).toBe(true)
  })

  it("closing with the button and unmounting an open drawer both restore the previous scroll setting", async () => {
    document.body.style.overflow = "scroll"
    const opener = await openDrawer()
    await act(async () => button("Close details").click())
    expect(document.activeElement).toBe(opener)
    expect(document.body.style.overflow).toBe("scroll")
    await openDrawer()
    expect(document.body.style.overflow).toBe("hidden")
    await act(async () => root?.unmount())
    root = undefined
    expect(document.body.style.overflow).toBe("scroll")
  })
})

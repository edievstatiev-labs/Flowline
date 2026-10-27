// @vitest-environment jsdom

import { act, useRef, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useFocusTrap } from "./use-focus-trap"

function ReviewDrawerHarness() {
  const [open, setOpen] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  useFocusTrap(open, panel, { onEscape: () => setOpen(false) })
  return (
    <>
      <button onClick={() => setOpen(true)}>Review workflow</button>
      {open ? (
        <div
          ref={panel}
          tabIndex={-1}
          role="dialog"
          aria-label="Workflow review"
        >
          <button onClick={() => setOpen(false)}>Close review</button>
          <button>Change frequency</button>
          <div hidden>
            <button>Inspect hidden source rows</button>
          </div>
          <button style={{ visibility: "hidden" }}>Unavailable control</button>
        </div>
      ) : null}
    </>
  )
}

describe("Workflow drawer keyboard containment", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    // jsdom has no layout. The real browser returns a rectangle for displayed
    // controls; hidden ancestry and CSS visibility remain real DOM conditions.
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue({
      length: 1,
    } as DOMRectList)
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
    await act(async () => root.render(<ReviewDrawerHarness />))
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const button = (name: string) =>
    [...container.querySelectorAll("button")].find(
      (el) => el.textContent === name
    )!
  async function open() {
    button("Review workflow").focus()
    await act(async () => button("Review workflow").click())
  }
  async function key(value: string, shiftKey = false) {
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: value,
          shiftKey,
          bubbles: true,
          cancelable: true,
        })
      )
    })
  }

  it("wraps between visible controls while the history panel is hidden", async () => {
    await open()
    expect(document.activeElement).toBe(button("Close review"))
    button("Change frequency").focus()
    await key("Tab")
    expect(document.activeElement).toBe(button("Close review"))
    await key("Tab", true)
    expect(document.activeElement).toBe(button("Change frequency"))
  })

})

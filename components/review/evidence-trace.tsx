"use client"

import { CheckCircle2, CircleAlert, ChevronDown } from "lucide-react"
import type { WorkflowResult } from "@/lib/engine/types"
import { Button } from "@/components/beui/button/base"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/beui/collapsible"

export function EvidenceTrace({
  workflow,
  onInspectRows,
}: {
  workflow: WorkflowResult
  onInspectRows?: (ids: string[]) => void
}) {
  const sourceLines = new Map(
    workflow.rows.map((row) => [row.id, row.sourceLine])
  )
  const shortTitles: Record<string, string> = {
    input: "Input checks",
    schedule: "Schedule",
    reruns: "Possible reruns",
    uncertainty: "Uncertainty",
    scope: "Scope rule",
  }
  return (
    <section aria-label="How this decision was reached">
      <h3 className="evidence-heading">How this decision was reached</h3>
      {workflow.evidence.map((step) => {
        const lines = step.rowIds
          .map((id) => sourceLines.get(id))
          .filter((line): line is number => line !== undefined)
        const StatusIcon =
          step.status === "warning" ? CircleAlert : CheckCircle2
        return (
          <Collapsible key={workflow.name + step.id} className="evidence-step">
            <CollapsibleTrigger className="evidence-trigger">
              <StatusIcon size={16} />
              <span>
                {step.status === "warning" ? "Warning" : "Complete"}:{" "}
                {shortTitles[step.id] ?? step.title}
              </span>
              <ChevronDown size={15} />
            </CollapsibleTrigger>
            <CollapsibleContent contentClassName="evidence-content">
              <p>{step.detail}</p>
              {lines.length > 0 && (
                <p className="source-line-note">
                  Source CSV {lines.length === 1 ? "line" : "lines"}{" "}
                  {lines.slice(0, 12).join(", ")}
                  {lines.length > 12 ? `, and ${lines.length - 12} more` : ""}.
                </p>
              )}
              {onInspectRows && lines.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onInspectRows(step.rowIds)}
                >
                  Inspect {lines.length} source{" "}
                  {lines.length === 1 ? "row" : "rows"}
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </section>
  )
}

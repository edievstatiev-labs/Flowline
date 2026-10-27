export type Frequency =
  | { kind: "interval"; minutes: number }
  | {
      kind:
        | "daily"
        | "weekdays"
        | "weekly"
        | "fortnightly"
        | "twice-monthly"
        | "monthly"
    }
  | { kind: "unknown" }
export type ScopeDecision = "in-scope" | "engineer-review"
export interface RunRow {
  id: string
  sourceLine: number
  workflowName: string
  startTime: string
  endTime: string
  startMs: number | null
  endMs: number | null
  status: string
  validStart: boolean
}
export interface CsvIssue {
  sourceLine: number
  workflowName?: string
  message: string
  severity: "warning" | "error"
}
export interface ParsedCsv {
  rows: RunRow[]
  totalRows: number
  duplicateRows: number
  duplicateRowsByWorkflow: Record<string, number>
  issues: CsvIssue[]
}
export interface EvidenceStep {
  id: string
  title: string
  status: "complete" | "warning"
  detail: string
  rowIds: string[]
}
export interface WorkflowResult {
  name: string
  frequency: Frequency
  scope: ScopeDecision
  reason: string
  rows: RunRow[]
  validRuns: number
  firstStart: number | null
  lastStart: number | null
  coverageDays: number
  gapsMinutes: number[]
  rerunIds: string[]
  duplicateRows: number
  invalidRows: number
  possiblyInactive: boolean
  evidence: EvidenceStep[]
  warnings: string[]
}
export interface DatasetAnalysis {
  results: WorkflowResult[]
  totalRows: number
  validRows: number
  duplicateRows: number
  invalidRows: number
  issues: CsvIssue[]
  latestTimestamp: number | null
}
export interface Correction {
  frequency: Frequency
  reason: string
  updatedAt: string
}
export type Corrections = Record<string, Correction>
export interface EffectiveResult {
  original: WorkflowResult
  frequency: Frequency
  scope: ScopeDecision
  correction?: Correction
}

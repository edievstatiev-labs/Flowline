import { frequencyLabel, scopeForFrequency } from "./inference"
import { formatWallClock } from "./csv"
import type {
  Correction,
  Corrections,
  EffectiveResult,
  Frequency,
  WorkflowResult,
} from "./types"

export function isFrequency(value: unknown): value is Frequency {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  if (item.kind === "interval")
    return (
      typeof item.minutes === "number" &&
      Number.isFinite(item.minutes) &&
      item.minutes > 0
    )
  return (
    typeof item.kind === "string" &&
    [
      "daily",
      "weekdays",
      "weekly",
      "fortnightly",
      "twice-monthly",
      "monthly",
      "unknown",
    ].includes(item.kind)
  )
}
export function validateCorrection(value: unknown): value is Correction {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  return (
    isFrequency(item.frequency) &&
    typeof item.reason === "string" &&
    item.reason.trim().length > 0 &&
    item.reason.length <= 2000 &&
    typeof item.updatedAt === "string" &&
    Number.isFinite(Date.parse(item.updatedAt))
  )
}
/** Corrupt or out-of-date storage must never silently alter scope decisions. */
export function parseCorrections(raw: string | null): Corrections {
  if (!raw) return Object.create(null)
  const parsed: unknown = JSON.parse(raw)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error(
      "Saved corrections are malformed. Original analysis is still available."
    )
  const result: Corrections = Object.create(null)
  for (const [name, value] of Object.entries(parsed)) {
    if (!name || !validateCorrection(value))
      throw new Error(
        "A saved correction is invalid. Original analysis is still available."
      )
    Object.defineProperty(result, name, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }
  return result
}
export function serializeCorrections(corrections: Corrections): string {
  const raw = JSON.stringify(corrections)
  parseCorrections(raw)
  return raw
}
export function applyCorrection(
  original: WorkflowResult,
  correction?: Correction
): EffectiveResult {
  if (correction && !validateCorrection(correction))
    throw new Error("Choose a valid frequency and supply a correction reason.")
  const frequency = correction?.frequency ?? original.frequency
  return {
    original,
    frequency,
    scope: scopeForFrequency(frequency),
    ...(correction ? { correction } : {}),
  }
}
export async function datasetFingerprint(text: string): Promise<string> {
  // Digest the original input: whitespace, source rows, and status changes make a
  // new dataset. Corrections are intentionally not shared across revised exports.
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}
function csvCell(value: unknown): string {
  let text = value === undefined || value === null ? "" : String(value)
  // Protect CSV consumers from formula injection in names or user-entered reasons.
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}
export function exportResultsCsv(
  results: WorkflowResult[],
  corrections: Corrections = {}
): string {
  const header = [
    "workflow_name",
    "original_frequency",
    "original_scope",
    "original_reason",
    "effective_frequency",
    "effective_scope",
    "correction_reason",
    "corrected_at",
    "valid_starts",
    "invalid_starts",
    "excluded_duplicates",
    "possible_reruns",
    "possibly_inactive",
    "first_start",
    "last_start",
    "evidence",
    "warnings",
  ]
  const body = results.map((result) => {
    const effective = applyCorrection(
      result,
      Object.hasOwn(corrections, result.name)
        ? corrections[result.name]
        : undefined
    )
    return [
      result.name,
      frequencyLabel(result.frequency),
      result.scope,
      result.reason,
      frequencyLabel(effective.frequency),
      effective.scope,
      effective.correction?.reason ?? "",
      effective.correction?.updatedAt ?? "",
      result.validRuns,
      result.invalidRows,
      result.duplicateRows,
      result.rerunIds.length,
      result.possiblyInactive,
      formatWallClock(result.firstStart),
      formatWallClock(result.lastStart),
      result.evidence
        .map((step) => `${step.title}: ${step.detail}`)
        .join(" | "),
      result.warnings.join(" | "),
    ]
      .map(csvCell)
      .join(",")
  })
  return (
    "\uFEFF" + [header.map(csvCell).join(","), ...body].join("\r\n") + "\r\n"
  )
}

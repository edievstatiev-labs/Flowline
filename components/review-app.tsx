"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/beui/button/base"
import { AnimatedBadge } from "@/components/beui/animated-badge"
import { Input } from "@/components/beui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/beui/select"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/beui/tabs"
import { Table, type TableColumn } from "@/components/beui/table"
import { Alert, AlertTitle, AlertDescription } from "@/components/beui/alert"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/beui/collapsible"
import { Drawer } from "@/components/beui/drawer"
import {
  MorphPopover,
  MorphPopoverTrigger,
  MorphPopoverContent,
} from "@/components/beui/popover-morph"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Search,
  Pencil,
  X,
  Check,
  FileText,
  RotateCcw,
  Info,
} from "lucide-react"
import {
  analyzeCsv,
  frequencyLabel,
  scopeForFrequency,
} from "@/lib/engine/inference"
import {
  applyCorrection,
  exportResultsCsv,
  datasetFingerprint,
  parseCorrections,
} from "@/lib/engine/review"
import type {
  Correction,
  Corrections,
  DatasetAnalysis,
  Frequency,
  WorkflowResult,
} from "@/lib/engine/types"
import { RunChart } from "@/components/review/run-chart"
import { OverviewCharts } from "@/components/review/overview-charts"
import { EvidenceTrace } from "@/components/review/evidence-trace"

type Filter = "all" | "engineer-review" | "in-scope"
type ExtraFilter = "any" | "corrected" | "inactive"
type Draft = { kind: string; minutes: string; reason: string }

const date = (ms: number | null) =>
  ms === null
    ? "Unavailable"
    : new Date(ms).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
const correctionFor = (corrections: Corrections, name: string) =>
  Object.hasOwn(corrections, name) ? corrections[name] : undefined
const storageKey = (fingerprint: string) => "flowline.review.v1." + fingerprint
const frequencyOptions = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Every 2 weeks" },
  { value: "twice-monthly", label: "Twice monthly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom interval" },
  { value: "unknown", label: "Unknown / needs investigation" },
]
function saveFile(contents: string) {
  const url = URL.createObjectURL(
    new Blob([contents], { type: "text/csv;charset=utf-8" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = "workflow-frequency-review.csv"
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function summary(workflow: WorkflowResult) {
  if (workflow.frequency.kind === "unknown") return workflow.reason
  const evidence = workflow.evidence.find(
    (step) => step.id === "schedule"
  )?.detail
  return evidence?.split(/(?<=\.) /)[0] ?? workflow.reason
}

export function ReviewApp() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [analysis, setAnalysis] = useState<DatasetAnalysis | null>(null)
  const [fileName, setFileName] = useState("run_history.csv")
  const [isSample, setIsSample] = useState(true)
  const [fingerprint, setFingerprint] = useState("")
  const [corrections, setCorrections] = useState<Corrections>({})
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [filter, setFilter] = useState<Filter>("all")
  const [extraFilter, setExtraFilter] = useState<ExtraFilter>("any")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState("")
  const [queue, setQueue] = useState<string[]>([])
  const [detailTab, setDetailTab] = useState("decision")
  const [showRows, setShowRows] = useState(false)
  const [inspectedRows, setInspectedRows] = useState<string[]>([])
  const [showFileDetails, setShowFileDetails] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(true)
  const fileInput = useRef<HTMLInputElement>(null)
  const importSequence = useRef(0)
  const activeDataset = useRef("")
  const dismissingDrawer = useRef(false)
  const workflowNames = useRef(new Set<string>())
  const listPosition = useRef(0)
  const lastRow = useRef("")
  const pageTitle = useRef<HTMLHeadingElement>(null)
  const detailTitle = useRef<HTMLHeadingElement>(null)
  const drawerScroll = useRef<HTMLDivElement>(null)
  const sourceHeading = useRef<HTMLHeadingElement>(null)
  const correctionHeading = useRef<HTMLHeadingElement>(null)
  const changeFrequencyButton = useRef<HTMLButtonElement>(null)
  const pendingFocus = useRef<"top" | "list" | "rows" | "correction" | null>(
    null
  )

  const load = useCallback(
    async (readText: () => Promise<string>, name: string, sample: boolean) => {
      const seq = ++importSequence.current
      setBusy(true)
      setError("")
      setNotice("")
      try {
        const text = await readText()
        if (seq !== importSequence.current) return
        const result = analyzeCsv(text)
        if (!result.results.length)
          throw new Error(
            "No workflows found. Include workflow_name, start_time, end_time and status columns."
          )
        const hash = await datasetFingerprint(text)
        if (seq !== importSequence.current) return
        let saved: Corrections = {}
        try {
          saved = parseCorrections(localStorage.getItem(storageKey(hash)))
        } catch {
          setNotice(
            "Saved corrections could not be read. Export changes to keep a copy."
          )
        }
        dismissingDrawer.current = false
        activeDataset.current = hash
        workflowNames.current = new Set(result.results.map((row) => row.name))
        // Reloading or replacing the dataset starts at its list, even if this
        // browser entry previously represented another dataset's detail page.
        window.history.replaceState(
          { flowlineDetail: false, datasetFingerprint: hash },
          "",
          window.location.pathname + window.location.search
        )
        setAnalysis(result)
        setFileName(name)
        setIsSample(sample)
        setFingerprint(hash)
        setCorrections(saved)
        setDrafts({})
        setSelected("")
        setQueue([])
        setFilter("all")
        setExtraFilter("any")
        setQuery("")
        setShowFileDetails(false)
        listPosition.current = 0
        pendingFocus.current = "top"
      } catch (e) {
        if (seq === importSequence.current)
          setError(e instanceof Error ? e.message : "Could not read this CSV.")
      } finally {
        if (seq === importSequence.current) setBusy(false)
      }
    },
    []
  )
  const loadSample = useCallback(
    () =>
      load(
        async () => {
          const response = await fetch("./data/run_history.csv")
          if (!response.ok)
            throw new Error(
              "The sample could not be loaded. Upload a CSV to continue."
            )
          return response.text()
        },
        "run_history.csv",
        true
      ),
    [load]
  )
  useEffect(() => {
    setMounted(true)
    void loadSample()
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = "manual"
    const onBack = (event: PopStateEvent) => {
      const state = event.state
      if (dismissingDrawer.current) {
        dismissingDrawer.current = false
        window.history.replaceState(
          { flowlineDetail: false, datasetFingerprint: activeDataset.current },
          "",
          window.location.pathname + window.location.search
        )
        setSelected("")
        pendingFocus.current = "list"
        setNotice("")
        return
      }
      if (
        state?.flowlineDetail &&
        state.datasetFingerprint === activeDataset.current &&
        typeof state.workflowName === "string" &&
        workflowNames.current.has(state.workflowName)
      ) {
        const restoredQueue = Array.isArray(state.queue)
          ? state.queue.filter(
              (name: unknown): name is string =>
                typeof name === "string" && workflowNames.current.has(name)
            )
          : []
        setSelected(state.workflowName)
        setQueue(
          restoredQueue.includes(state.workflowName)
            ? restoredQueue
            : [state.workflowName]
        )
        setDetailTab("decision")
        setShowRows(false)
        setInspectedRows([])
        pendingFocus.current = "top"
      } else {
        window.history.replaceState(
          { flowlineDetail: false, datasetFingerprint: activeDataset.current },
          "",
          window.location.pathname + window.location.search
        )
        setSelected("")
        pendingFocus.current = "list"
      }
      setNotice("")
    }
    window.addEventListener("popstate", onBack)
    return () => {
      importSequence.current++
      window.removeEventListener("popstate", onBack)
      window.history.scrollRestoration = previousRestoration
    }
  }, [loadSample])
  useEffect(() => {
    if (!pendingFocus.current) return
    const frame = requestAnimationFrame(() => {
      const target = pendingFocus.current
      if (target === "list") {
        window.scrollTo({ top: listPosition.current, behavior: "instant" })
        const row = Array.from(
          document.querySelectorAll<HTMLButtonElement>("[data-workflow]")
        ).find((el) => el.dataset.workflow === lastRow.current)
        ;(row ?? pageTitle.current)?.focus({ preventScroll: true })
      } else if (target === "rows") {
        sourceHeading.current?.scrollIntoView({
          block: "start",
          behavior: "instant",
        })
        sourceHeading.current?.focus({ preventScroll: true })
      } else if (target === "correction") {
        correctionHeading.current?.scrollIntoView({
          block: "start",
          behavior: "instant",
        })
        correctionHeading.current?.focus({ preventScroll: true })
      } else {
        if (selected) {
          drawerScroll.current?.scrollTo({ top: 0, behavior: "instant" })
          detailTitle.current?.focus({ preventScroll: true })
        } else {
          window.scrollTo({ top: 0, behavior: "instant" })
          pageTitle.current?.focus({ preventScroll: true })
        }
      }
      pendingFocus.current = null
    })
    return () => cancelAnimationFrame(frame)
  }, [selected, detailTab, showRows, inspectedRows, drafts, analysis])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(""), 6000)
    return () => clearTimeout(timer)
  }, [notice])

  const effective = useMemo(
    () =>
      analysis?.results.map((r) =>
        applyCorrection(r, correctionFor(corrections, r.name))
      ) ?? [],
    [analysis, corrections]
  )
  const counts = useMemo(
    () => ({
      all: effective.length,
      "engineer-review": effective.filter((r) => r.scope === "engineer-review")
        .length,
      "in-scope": effective.filter((r) => r.scope === "in-scope").length,
    }),
    [effective]
  )
  const visible = effective
    .filter(
      (r) =>
        r.original.name.toLowerCase().includes(query.toLowerCase()) &&
        (filter === "all" || r.scope === filter) &&
        (extraFilter === "any" ||
          (extraFilter === "corrected"
            ? !!r.correction
            : r.original.possiblyInactive))
    )
    .sort((a, b) => {
      const rank = (r: typeof a) =>
        r.scope === "engineer-review"
          ? r.frequency.kind === "unknown"
            ? 0
            : 1
          : 2
      return rank(a) - rank(b) || a.original.name.localeCompare(b.original.name)
    })
  const workflow = analysis?.results.find((r) => r.name === selected)
  const correction = workflow
    ? correctionFor(corrections, workflow.name)
    : undefined
  const current = workflow ? applyCorrection(workflow, correction) : null
  const draft =
    workflow && Object.hasOwn(drafts, workflow.name)
      ? drafts[workflow.name]
      : undefined
  const position = queue.indexOf(selected)

  function chooseWorkflow(name: string, fromList = true) {
    dismissingDrawer.current = false
    if (fromList) {
      listPosition.current = window.scrollY
      lastRow.current = name
      setQueue(visible.map((r) => r.original.name))
      window.history.pushState(
        {
          flowlineDetail: true,
          datasetFingerprint: activeDataset.current,
          workflowName: name,
          queue: visible.map((r) => r.original.name),
        },
        "",
        "#workflow=" + encodeURIComponent(name)
      )
    }
    if (!fromList)
      window.history.replaceState(
        {
          flowlineDetail: true,
          datasetFingerprint: activeDataset.current,
          workflowName: name,
          queue,
        },
        "",
        "#workflow=" + encodeURIComponent(name)
      )
    setSelected(name)
    setDetailTab("decision")
    setShowRows(false)
    setInspectedRows([])
    setNotice("")
    pendingFocus.current = "top"
  }
  function backToList() {
    pendingFocus.current = "list"
    setSelected("")
    setNotice("")
    if (window.history.state?.flowlineDetail) {
      dismissingDrawer.current = true
      window.history.back()
    } else
      window.history.replaceState(
        { flowlineDetail: false, datasetFingerprint: activeDataset.current },
        "",
        window.location.pathname + window.location.search
      )
  }
  function inspectRows(ids: string[]) {
    setDetailTab("history")
    setShowRows(true)
    setInspectedRows(ids)
    pendingFocus.current = "rows"
  }
  function startCorrection() {
    if (!workflow || !current) return
    if (draft && detailTab === "decision") {
      // No React state changes in this case, so the focus effect cannot run.
      requestAnimationFrame(() => {
        correctionHeading.current?.scrollIntoView({
          block: "start",
          behavior: "instant",
        })
        correctionHeading.current?.focus({ preventScroll: true })
      })
      return
    }
    if (!draft)
      setDrafts((previous) => ({
        ...previous,
        [workflow.name]: {
          kind:
            current.frequency.kind === "interval"
              ? current.frequency.minutes === 60
                ? "hourly"
                : "custom"
              : current.frequency.kind,
          minutes:
            current.frequency.kind === "interval"
              ? String(current.frequency.minutes)
              : "60",
          reason: correction?.reason ?? "",
        },
      }))
    setDetailTab("decision")
    pendingFocus.current = "correction"
  }
  function discardDraft(restoreFocus = false) {
    if (!workflow) return
    setDrafts((previous) => {
      const next = { ...previous }
      delete next[workflow.name]
      return next
    })
    if (restoreFocus)
      requestAnimationFrame(() => changeFrequencyButton.current?.focus())
  }
  function updateCorrection(value?: Correction) {
    if (!workflow) return
    const next: Corrections = Object.assign(Object.create(null), corrections)
    if (value) next[workflow.name] = value
    else delete next[workflow.name]
    setCorrections(next)
    discardDraft()
    pendingFocus.current = "top"
    try {
      localStorage.setItem(storageKey(fingerprint), JSON.stringify(next))
      setNotice(
        value
          ? "Correction saved. Scope updated."
          : "Original inference restored."
      )
    } catch {
      setNotice(
        "Change applied, but storage is unavailable. Export to keep it."
      )
    }
  }

  const columns: TableColumn<(typeof effective)[number]>[] = [
    {
      key: "name",
      header: "Workflow",
      width: "48%",
      cell: ({ original: row, correction: changed }) => (
        <div>
          <Button
            variant="ghost"
            data-workflow={row.name}
            onClick={(event) => {
              event.stopPropagation()
              chooseWorkflow(row.name)
            }}
            className="workflow-name"
          >
            {row.name}
          </Button>
          {(changed ||
            row.possiblyInactive ||
            Object.hasOwn(drafts, row.name)) && (
            <span className="row-note">
              {Object.hasOwn(drafts, row.name)
                ? "Unsaved change"
                : changed
                  ? "Corrected"
                  : "Possibly inactive"}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "frequency",
      header: "Frequency",
      width: "25%",
      cell: (row) => frequencyLabel(row.frequency),
    },
    {
      key: "scope",
      header: "Decision",
      width: "23%",
      cell: (row) => <ScopeLabel scope={row.scope} />,
    },
    {
      key: "open",
      header: <span className="sr-only">Open workflow</span>,
      width: "4%",
      cell: () => <ArrowRight size={15} aria-hidden="true" />,
    },
  ]

  return (
    <div className="review-app beui-theme">
      <a className="skip-link" href="#review-content">
        Skip to workflows
      </a>
      <header className="app-bar" inert={!!workflow}>
        <div className="app-bar-inner">
          <div className="product-name">
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>Flowline</span>
            <span className="product-purpose">Migration review</span>
          </div>
          <div className="theme-control">
            <SimpleSelect
              label="Color theme"
              value={mounted ? (theme ?? "system") : "system"}
              onChange={setTheme}
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </div>
        </div>
      </header>
      <main
        id="review-content"
        className="review-page"
        aria-busy={busy}
        inert={!!workflow}
      >
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          aria-label="Upload run history CSV"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ""
            if (!file) return
            void load(
              async () => {
                if (file.size > 10 * 1024 * 1024)
                  throw new Error("Choose a CSV smaller than 10 MB.")
                return file.text()
              },
              file.name,
              false
            )
          }}
        />
        {error && (
          <Alert variant="destructive" className="upload-error">
            <div>
              <AlertTitle>Could not load this file</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </div>
          </Alert>
        )}
        {!workflow && notice && (
          <Notice message={notice} onDismiss={() => setNotice("")} />
        )}
        <header className="list-page-heading">
          <div className="title-row">
            <h1 ref={pageTitle} tabIndex={-1}>
              Workflow frequency
            </h1>
            <MorphPopover>
              <MorphPopoverTrigger>
                <Button
                  variant="ghost"
                  className="scope-rule-trigger"
                  aria-label="View scope rule"
                >
                  <AnimatedBadge
                    status="neutral"
                    size="sm"
                    icon={<Info size={12} />}
                  >
                    Scope rule
                  </AnimatedBadge>
                </Button>
              </MorphPopoverTrigger>
              <MorphPopoverContent align="start" className="scope-rule-content">
                <h2>Scope rule</h2>
                <p>
                  Hourly or less often is in scope. Faster or unknown needs an
                  engineer.
                </p>
              </MorphPopoverContent>
            </MorphPopover>
          </div>
          <div className="page-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              <ArrowUp size={16} />
              Upload CSV
            </Button>
            <Button
              disabled={!analysis || busy}
              onClick={() => {
                saveFile(exportResultsCsv(analysis!.results, corrections))
                setNotice(
                  "Exported all " +
                    counts.all +
                    " workflows, with original and corrected decisions."
                )
              }}
            >
              <ArrowDown size={16} />
              Export review
            </Button>
          </div>
        </header>
        <Collapsible
          open={showFileDetails}
          onOpenChange={setShowFileDetails}
          className="file-disclosure"
        >
          <CollapsibleTrigger className="file-summary">
            <FileText size={15} />
            <span>{fileName}</span>
            <span className="file-summary-meta">
              {isSample ? "Sample" : "Uploaded"}
              {analysis
                ? " · " +
                  analysis.totalRows.toLocaleString() +
                  " " +
                  (analysis.totalRows === 1 ? "run" : "runs")
                : ""}
            </span>
            <ChevronDown
              size={14}
              className={showFileDetails ? "rotate-180" : ""}
            />
          </CollapsibleTrigger>
          <CollapsibleContent contentClassName="file-details">
            <section>
              <h2>About this export</h2>
              <p>
                {analysis
                  ? "Latest start: " + date(analysis.latestTimestamp) + ". "
                  : ""}
                Source wall-clock times. Your CSV stays in this browser.
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={loadSample}
                disabled={busy}
              >
                <RotateCcw size={14} />
                Reload sample
              </Button>
            </section>
            <section>
              <h2>Input checks</h2>
              <p>
                {analysis?.duplicateRows ?? 0} duplicate rows ·{" "}
                {analysis?.invalidRows ?? 0} invalid rows. Missing end times are
                allowed.
              </p>
              {!!analysis?.issues.length && (
                <ul>
                  {analysis.issues.map((issue, index) => (
                    <li key={index}>
                      Row {issue.sourceLine}: {issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </CollapsibleContent>
        </Collapsible>
        {analysis && (
          <section className="overview-section" aria-label="Dataset overview">
            <OverviewCharts
              analysis={analysis}
              inScope={counts["in-scope"]}
              engineerReview={counts["engineer-review"]}
            />
          </section>
        )}
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as Filter)}
          variant="underline"
        >
          <div className="list-toolbar">
            <TabsList aria-label="Workflow scope">
              <TabsTrigger value="all">
                All <span className="tab-count">{counts.all}</span>
              </TabsTrigger>
              <TabsTrigger value="engineer-review">
                Engineer review{" "}
                <span className="tab-count">{counts["engineer-review"]}</span>
              </TabsTrigger>
              <TabsTrigger value="in-scope">
                In scope <span className="tab-count">{counts["in-scope"]}</span>
              </TabsTrigger>
            </TabsList>
            <div className="list-search">
              <Input
                aria-label="Search workflows"
                leftIcon={<Search size={16} />}
                placeholder="Find a workflow…"
                value={query}
                onChange={setQuery}
              />
              <SimpleSelect
                label="Additional filter"
                value={extraFilter}
                onChange={(value) => setExtraFilter(value as ExtraFilter)}
                options={[
                  { value: "any", label: "Any state" },
                  { value: "corrected", label: "Corrected" },
                  { value: "inactive", label: "Possibly inactive" },
                ]}
              />
            </div>
          </div>
          {(["all", "engineer-review", "in-scope"] as Filter[]).map((view) => (
            <TabsContent key={view} value={view}>
              <Table
                ariaLabel="Workflow results"
                className="results-table"
                selectedRowIds={selected ? [selected] : []}
                pageScroll
                data={visible}
                columns={columns}
                getRowId={(row) => row.original.name}
                onRowClick={(row) => chooseWorkflow(row.original.name)}
                rowHeight={62}
                loading={busy}
                emptyState={
                  <div className="empty-results">
                    <h2>No matching workflows</h2>
                    <p>Try another name or clear the filters.</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQuery("")
                        setFilter("all")
                        setExtraFilter("any")
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                }
              />
            </TabsContent>
          ))}
        </Tabs>
        <footer className="list-footer">
          <span>
            {analysis
              ? "Showing " + visible.length + " of " + counts.all + " workflows"
              : "Loading sample"}
          </span>
          <span>
            Inferred from observed starts · Names never determine frequency
          </span>
        </footer>
      </main>
      <Drawer
        open={!!workflow}
        onOpenChange={(open) => {
          if (!open) backToList()
        }}
        side="right"
        ariaLabel={
          workflow ? "Workflow details: " + workflow.name : "Workflow details"
        }
        className="workflow-drawer"
        backdropClassName="workflow-backdrop"
      >
        {workflow && current && (
          <>
            <div className="drawer-topbar">
              <span>Workflow details</span>
              <nav
                className="sequence-navigation"
                aria-label="Workflow navigation"
              >
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Previous workflow"
                  disabled={position <= 0}
                  onClick={() => chooseWorkflow(queue[position - 1], false)}
                >
                  <ArrowLeft size={17} />
                </Button>
                <span>
                  {position + 1} of {queue.length}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Next workflow"
                  disabled={position < 0 || position === queue.length - 1}
                  onClick={() => chooseWorkflow(queue[position + 1], false)}
                >
                  <ArrowRight size={17} />
                </Button>
              </nav>
              <span className="drawer-header-divider" />
              <Button
                size="icon"
                variant="ghost"
                className="drawer-close"
                aria-label="Close workflow details"
                onClick={backToList}
              >
                <X size={18} />
              </Button>
            </div>
            <div className="drawer-body" ref={drawerScroll}>
              <header className="detail-title">
                <h2 ref={detailTitle} tabIndex={-1}>
                  {workflow.name}
                </h2>
                <p>
                  {workflow.validRuns} observed{" "}
                  {workflow.validRuns === 1 ? "start" : "starts"}
                  {workflow.firstStart !== null
                    ? " · " +
                      date(workflow.firstStart) +
                      " – " +
                      date(workflow.lastStart)
                    : " · History unavailable"}
                </p>
              </header>
              {notice && (
                <Notice message={notice} onDismiss={() => setNotice("")} />
              )}
              <Tabs
                value={detailTab}
                onValueChange={setDetailTab}
                variant="underline"
              >
                <TabsList aria-label="Workflow detail views">
                  <TabsTrigger value="decision">Decision</TabsTrigger>
                  <TabsTrigger value="history">Run history</TabsTrigger>
                </TabsList>
                <TabsContent value="decision" className="decision-content">
                  <div className="decision-summary">
                    <div>
                      <p className="decision-frequency">
                        {frequencyLabel(current.frequency)}
                      </p>
                      <ScopeLabel scope={current.scope} />
                    </div>
                    <Button
                      ref={changeFrequencyButton}
                      variant="outline"
                      onClick={startCorrection}
                    >
                      <Pencil size={15} />
                      {draft ? "Continue editing" : "Change frequency"}
                    </Button>
                  </div>
                  <p className="decision-explanation">
                    {correction ? correction.reason : summary(workflow)}
                  </p>
                  {correction && (
                    <p className="correction-baseline">
                      Corrected · Original inference:{" "}
                      {frequencyLabel(workflow.frequency)}. Evidence below
                      describes the original inference.{" "}
                      <Button
                        variant="ghost"
                        className="text-action"
                        onClick={() => updateCorrection()}
                      >
                        Reset to inference
                      </Button>
                    </p>
                  )}
                  {workflow.rerunIds.length > 0 && (
                    <Alert variant="warning" className="exception-note">
                      <AlertDescription>
                        {workflow.rerunIds.length} possible{" "}
                        {workflow.rerunIds.length === 1
                          ? "rerun was"
                          : "reruns were"}{" "}
                        excluded from the pattern.{" "}
                        <Button
                          variant="ghost"
                          className="text-action"
                          onClick={() => inspectRows(workflow.rerunIds)}
                        >
                          Inspect runs
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                  {workflow.possiblyInactive && (
                    <Alert variant="warning" className="exception-note">
                      <AlertDescription>
                        Possibly inactive · Last seen {date(workflow.lastStart)}
                        . Check with the owner; this does not change scope.
                      </AlertDescription>
                    </Alert>
                  )}
                  {draft && (
                    <section
                      className="correction-section"
                      aria-label="Change frequency"
                    >
                      <h3 ref={correctionHeading} tabIndex={-1}>
                        Change frequency
                      </h3>
                      <CorrectionForm
                        key={workflow.name}
                        draft={draft}
                        onChange={(value) =>
                          setDrafts((previous) => ({
                            ...previous,
                            [workflow.name]: value,
                          }))
                        }
                        onSave={updateCorrection}
                        onCancel={() => discardDraft(true)}
                      />
                    </section>
                  )}
                  <div className="decision-trace">
                    <EvidenceTrace
                      key={workflow.name}
                      workflow={workflow}
                      onInspectRows={inspectRows}
                    />
                  </div>
                  <p className="scope-rule">
                    Scope rule: hourly or less often is in scope. Faster or
                    unresolved goes to an engineer.
                  </p>
                </TabsContent>
                <TabsContent value="history" className="history-content">
                  {!inspectedRows.length && (
                    <RunChart
                      key={fingerprint + workflow.name}
                      workflow={workflow}
                      onSelectRun={(id) => inspectRows([id])}
                    />
                  )}
                  <div className="source-controls">
                    <h3 ref={sourceHeading} tabIndex={-1}>
                      {inspectedRows.length
                        ? "Referenced source rows"
                        : "Source rows"}
                    </h3>
                    {inspectedRows.length ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setInspectedRows([])
                          setShowRows(true)
                        }}
                      >
                        Show all runs
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        aria-expanded={showRows}
                        onClick={() => setShowRows(!showRows)}
                      >
                        {showRows
                          ? "Hide rows"
                          : "Show " + workflow.rows.length + " rows"}
                      </Button>
                    )}
                  </div>
                  {(showRows || !!inspectedRows.length) && (
                    <RunHistory
                      workflow={workflow}
                      highlighted={inspectedRows}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </Drawer>
    </div>
  )
}

function SimpleSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue
          placeholder={
            options.find((option) => option.value === value)?.label ?? "Select"
          }
        />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
function Notice({
  message,
  onDismiss,
}: {
  message: string
  onDismiss: () => void
}) {
  return (
    <Alert className="save-notice" role="status">
      <Check size={16} />
      <AlertDescription>{message}</AlertDescription>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Dismiss notice"
        onClick={onDismiss}
      >
        <X size={15} />
      </Button>
    </Alert>
  )
}
function ScopeLabel({ scope }: { scope: "in-scope" | "engineer-review" }) {
  return (
    <AnimatedBadge
      status={scope === "engineer-review" ? "warning" : "neutral"}
      showIcon={false}
      size="sm"
      data-scope={scope}
      className="scope-badge"
    >
      {scope === "in-scope" ? "In scope" : "Engineer review"}
    </AnimatedBadge>
  )
}
function RunHistory({
  workflow,
  highlighted,
}: {
  workflow: WorkflowResult
  highlighted: string[]
}) {
  const rows = highlighted.length
    ? workflow.rows.filter((row) => highlighted.includes(row.id))
    : [...workflow.rows].reverse()
  const columns: TableColumn<(typeof rows)[number]>[] = [
    {
      key: "line",
      header: "CSV row",
      width: "14%",
      align: "right",
      cell: (row) => row.sourceLine,
    },
    {
      key: "time",
      header: "Start / end",
      width: "56%",
      cell: (row) => (
        <div>
          <span className="source-time">
            {row.startTime || "Invalid start"}
          </span>
          <span className="row-note">End: {row.endTime || "Not recorded"}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "30%",
      cell: (row) => (
        <div>
          <AnimatedBadge status="neutral" size="sm" showIcon={false}>
            {row.status || "Not recorded"}
          </AnimatedBadge>
          {workflow.rerunIds.includes(row.id) && (
            <span className="row-note">Possible rerun</span>
          )}
        </div>
      ),
    },
  ]
  return (
    <Table
      className="source-table"
      ariaLabel="Source run rows"
      pageScroll
      data={rows}
      columns={columns}
      getRowId={(row) => row.id}
      rowHeight={72}
    />
  )
}
function CorrectionForm({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Draft
  onChange: (value: Draft) => void
  onSave: (value: Correction) => void
  onCancel: () => void
}) {
  const [validation, setValidation] = useState("")
  const frequency: Frequency =
    draft.kind === "hourly"
      ? { kind: "interval", minutes: 60 }
      : draft.kind === "custom"
        ? { kind: "interval", minutes: Number(draft.minutes) }
        : { kind: draft.kind as Exclude<Frequency["kind"], "interval"> }
  const validInterval =
    draft.kind !== "custom" ||
    (Number.isFinite(Number(draft.minutes)) && Number(draft.minutes) > 0)
  return (
    <form
      className="correction-form"
      onSubmit={(event) => {
        event.preventDefault()
        if (
          !draft.reason.trim() ||
          draft.reason.length > 2000 ||
          !validInterval
        ) {
          setValidation("Enter a positive interval and a reason.")
          return
        }
        setValidation("")
        onSave({
          frequency,
          reason: draft.reason.trim(),
          updatedAt: new Date().toISOString(),
        })
      }}
    >
      <div>
        <label className="field-label" id="frequency-label">
          Frequency
        </label>
        <SimpleSelect
          label="Frequency"
          value={draft.kind}
          onChange={(kind) => onChange({ ...draft, kind })}
          options={frequencyOptions}
        />
      </div>
      {draft.kind === "custom" && (
        <Input
          label="Interval in minutes"
          type="number"
          min="0.001"
          step="any"
          required
          value={draft.minutes}
          onChange={(minutes) => onChange({ ...draft, minutes })}
        />
      )}
      <Input
        label="Reason for the change"
        maxLength={2000}
        required
        placeholder="What confirms this frequency?"
        value={draft.reason}
        onChange={(reason) => onChange({ ...draft, reason })}
      />
      {validation && (
        <p role="alert" className="text-destructive">
          {validation}
        </p>
      )}
      <div className="correction-result">
        <span>Resulting decision</span>
        {validInterval ? (
          <ScopeLabel scope={scopeForFrequency(frequency)} />
        ) : (
          <span>Enter an interval</span>
        )}
      </div>
      <div className="form-actions">
        <Button type="submit">Save correction</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <p className="form-note">
        Saved locally for this file. Original evidence stays available.
      </p>
    </form>
  )
}

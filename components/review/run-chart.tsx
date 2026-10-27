"use client"

import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react"
import { ChevronLeft, ChevronRight, Info, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/beui/button/base"
import { ScatterChart } from "@/components/bklit/scatter-chart"
import { Scatter } from "@/components/bklit/scatter"
import { Grid } from "@/components/bklit/grid"
import { ChartTooltip, TooltipContent } from "@/components/bklit/tooltip"
import { AnimatedBadge } from "@/components/beui/animated-badge"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/beui/collapsible"
import { XAxis } from "@/components/bklit/x-axis"
import { YAxis } from "@/components/bklit/y-axis"
import { useChartHover, useChartStable } from "@/components/bklit/chart-context"
import type { RunRow, WorkflowResult } from "@/lib/engine/types"
import {
  observedRunPoints,
  sourceDateLabel,
  sourceHourLabel,
  type RunStartPoint,
} from "./chart-data"

const SOURCE_HOUR_TICKS = [0, 6, 12, 18, 24]

function sourceDay(row: RunRow) {
  return row.startMs === null
    ? row.startTime.split(/[T ]/)[0]
    : new Date(row.startMs).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
}
function sourceClock(row: RunRow) {
  return row.startTime.trim().split(/[T ]+/)[1] ?? "—"
}
function exactStart(row: RunRow) {
  return `${sourceDay(row)} · ${sourceClock(row)}`
}

function gapLabel(minutes: number | undefined) {
  if (minutes === undefined) return "—"
  if (minutes < 60) return `${Number(minutes.toFixed(1))} min`
  if (minutes < 1440) return `${Number((minutes / 60).toFixed(1))} h`
  const days = Number((minutes / 1440).toFixed(1))
  return `${days} ${days === 1 ? "day" : "days"}`
}

/** Connect ordinary keyboard controls to Bklit's own tooltip/highlight state. */
function KeyboardHighlight({
  index,
  points,
  onPoint,
}: {
  index: number | null
  points: RunStartPoint[]
  onPoint: (index: number) => void
}) {
  const { setTooltipData, tooltipData } = useChartHover()
  const { xScale, yScale } = useChartStable()
  const hoveredIndex = tooltipData?.index
  useEffect(() => {
    if (
      hoveredIndex !== undefined &&
      hoveredIndex >= 0 &&
      hoveredIndex < points.length
    )
      onPoint(hoveredIndex)
  }, [hoveredIndex, points.length, onPoint])
  useEffect(() => {
    if (index === null || !points[index]) return
    const point = points[index]
    const dataKey =
      point.possibleRerun !== null
        ? "possibleRerun"
        : point.other !== null
          ? "other"
          : "success"
    const value = point[dataKey] as number
    setTooltipData({
      point,
      index,
      x: xScale(point.date) ?? 0,
      yPositions: { [dataKey]: yScale(value) ?? 0 },
      activeDataKey: dataKey,
    })
  }, [index, points, xScale, yScale, setTooltipData])
  return null
}

export function RunChart({
  workflow,
  onSelectRun,
}: {
  workflow: WorkflowResult
  onSelectRun?: (id: string) => void
}) {
  const id = useId()
  const points = useMemo(() => observedRunPoints(workflow), [workflow])
  const [activeIndex, setActiveIndex] = useState(0)
  const [keyboardIndex, setKeyboardIndex] = useState<number | null>(null)
  const active = points[Math.min(activeIndex, points.length - 1)]?.sourceRow
  const reruns = useMemo(() => new Set(workflow.rerunIds), [workflow.rerunIds])
  const hasSuccess = points.some((point) => point.success !== null)
  const hasOtherStatus = points.some((point) => point.other !== null)
  const hasReruns = points.some((point) => point.possibleRerun !== null)
  const gaps = [...workflow.gapsMinutes].sort((a, b) => a - b)
  const middle = Math.floor(gaps.length / 2)
  const median = gaps.length
    ? gaps.length % 2
      ? gaps[middle]
      : (gaps[middle - 1] + gaps[middle]) / 2
    : undefined

  function select(index: number) {
    const bounded = Math.max(0, Math.min(points.length - 1, index))
    setActiveIndex(bounded)
    setKeyboardIndex(bounded)
  }
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    let next: number | undefined
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = activeIndex + 1
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = activeIndex - 1
    if (event.key === "Home") next = 0
    if (event.key === "End") next = points.length - 1
    if (next !== undefined) {
      event.preventDefault()
      select(next)
    } else if (
      event.key === "Enter" &&
      event.target === event.currentTarget &&
      active
    ) {
      event.preventDefault()
      onSelectRun?.(active.id)
    }
  }

  return (
    <Collapsible>
      <figure className="run-chart" aria-labelledby={`${id}-title`}>
        <div className="run-chart-heading">
          <div className="run-chart-title">
            <h3 id={`${id}-title`}>Run starts</h3>
            <CollapsibleTrigger
              className="chart-info-trigger"
              aria-label="Chart details"
            >
              <Info size={14} />
            </CollapsibleTrigger>
          </div>
          <div className="run-chart-legend" aria-label="Chart legend">
            {hasSuccess && (
              <span>
                <i className="run-dot run-dot-success" aria-hidden="true" />
                Success
              </span>
            )}
            {hasOtherStatus && (
              <span>
                <i className="run-dot run-dot-other" aria-hidden="true" />
                Other status
              </span>
            )}
            {hasReruns && (
              <span>
                <i className="run-dot run-dot-rerun" aria-hidden="true" />
                Possible rerun
              </span>
            )}
          </div>
        </div>
        <CollapsibleContent>
          <div className="run-chart-info">
            <h4>About these runs</h4>
            <p>
              All exported starts are shown in source-clock time. Missing dates
              can reflect incomplete history.
            </p>
            <dl className="gap-statistics">
              <div>
                <dt>Shortest gap</dt>
                <dd>{gapLabel(gaps[0])}</dd>
              </div>
              <div>
                <dt>Median gap</dt>
                <dd>{gapLabel(median)}</dd>
              </div>
              <div>
                <dt>Longest gap</dt>
                <dd>{gapLabel(gaps.at(-1))}</dd>
              </div>
            </dl>
            <p>
              Gaps include possible reruns and do not establish the schedule.
            </p>
            <p>Arrow keys select a run. Enter opens its source row.</p>
          </div>
        </CollapsibleContent>
        {!points.length ? (
          <p className="py-3 text-sm text-muted-foreground">
            No valid start timestamps to plot.
          </p>
        ) : (
          <>
            <div
              tabIndex={0}
              role="group"
              aria-label="Observed run chart. Arrow keys select runs; Home and End jump; Enter opens the selected source row."
              aria-describedby={`${id}-help`}
              onKeyDown={navigate}
              className="run-plot-focus"
            >
              <ScatterChart
                data={points}
                yDomain={[0, 24]}
                allowTouchScroll
                xDataKey="date"
                animationDuration={0}
                aspectRatio="auto"
                className="bklit-chart run-scatter-plot"
                margin={{ top: 14, right: 16, bottom: 34, left: 44 }}
                formatXLabel={sourceDateLabel}
              >
                <Grid
                  rowTickValues={SOURCE_HOUR_TICKS}
                  stroke="var(--chart-grid)"
                  strokeDasharray="2 6"
                  fadeHorizontal={false}
                />
                {hasSuccess && (
                  <Scatter
                    dataKey="success"
                    fill="var(--chart-1)"
                    radius={4}
                    inactiveOpacity={0.3}
                    animate={false}
                  />
                )}
                {hasOtherStatus && (
                  <Scatter
                    dataKey="other"
                    fill="var(--chart-2)"
                    radius={4}
                    inactiveOpacity={0.3}
                    animate={false}
                  />
                )}
                {hasReruns && (
                  <Scatter
                    dataKey="possibleRerun"
                    fill="var(--background)"
                    stroke="var(--chart-1)"
                    strokeWidth={1.5}
                    ringGap={0}
                    radius={4}
                    inactiveOpacity={0.3}
                    animate={false}
                  />
                )}
                <XAxis
                  numTicks={{ base: 3, sm: 4 }}
                  tickMode="data"
                  labels={points.map((point) => sourceDateLabel(point.date))}
                />
                <YAxis
                  tickValues={SOURCE_HOUR_TICKS}
                  formatValue={sourceHourLabel}
                />
                <ChartTooltip
                  showDatePill={false}
                  showDots={false}
                  showCrosshair={false}
                  damping={0}
                  exit={false}
                  content={({ point }) => {
                    const row = point.sourceRow as RunRow
                    const color = reruns.has(row.id)
                      ? "var(--chart-1)"
                      : row.status.toLowerCase() === "succeeded"
                        ? "var(--chart-1)"
                        : "var(--chart-2)"
                    return (
                      <TooltipContent
                        title={exactStart(row)}
                        rows={[
                          {
                            color,
                            label: "Status",
                            value: row.status || "Status missing",
                          },
                          {
                            color: "var(--muted-foreground)",
                            label: "CSV row",
                            value: row.sourceLine,
                          },
                          ...(reruns.has(row.id)
                            ? [
                                {
                                  color: "var(--chart-1)",
                                  label: "Pattern",
                                  value: "Possible rerun",
                                },
                              ]
                            : []),
                        ]}
                      />
                    )
                  }}
                />
                <KeyboardHighlight
                  index={keyboardIndex}
                  points={points}
                  onPoint={setActiveIndex}
                />
              </ScatterChart>
            </div>
            {active && (
              <figcaption className="run-inspector">
                <div className="run-selection-bar">
                  <span>Selected run</span>
                  <div
                    className="run-navigation"
                    aria-label="Inspect observed runs"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Previous observed run"
                      disabled={activeIndex === 0}
                      onClick={() => select(activeIndex - 1)}
                    >
                      <ChevronLeft size={15} aria-hidden="true" />
                    </Button>
                    <span className="tabular-nums">
                      {activeIndex + 1} of {points.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Next observed run"
                      disabled={activeIndex >= points.length - 1}
                      onClick={() => select(activeIndex + 1)}
                    >
                      <ChevronRight size={15} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                <div className="run-inspector-body">
                  <dl
                    className="selected-run-details"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <div>
                      <dt>Started</dt>
                      <dd className="selected-run-time">
                        <span>{sourceDay(active)}</span>
                        <strong>{sourceClock(active)}</strong>
                      </dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <AnimatedBadge
                          status="neutral"
                          size="sm"
                          showIcon={false}
                        >
                          {active.status || "Status missing"}
                        </AnimatedBadge>
                        {reruns.has(active.id) && (
                          <span className="selected-rerun">Possible rerun</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                  <Button
                    size="sm"
                    variant="outline"
                    className="run-source-action"
                    aria-label={`View source row ${active.sourceLine}`}
                    onClick={() => onSelectRun?.(active.id)}
                  >
                    View row {active.sourceLine}
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </Button>
                </div>
              </figcaption>
            )}
            <p id={`${id}-help`} className="sr-only">
              Times use the source clock, from midnight to midnight. Arrow keys
              select runs and Enter opens the selected CSV row. Missing dates
              may reflect incomplete export history.
            </p>
          </>
        )}
      </figure>
    </Collapsible>
  )
}

"use client"

import { useId, useMemo, useState } from "react"
import { useReducedMotion } from "motion/react"
import { Button } from "@/components/beui/button/base"
import {
  Legend,
  LegendItem,
  LegendLabel,
  LegendMarker,
  LegendValue,
  useLegend,
  useLegendItem,
} from "@/components/bklit/legend"
import { curveLinear } from "@visx/curve"
import { AreaChart } from "@/components/bklit/area-chart"
import { Area } from "@/components/bklit/area"
import { PieChart } from "@/components/bklit/pie-chart"
import { PieSlice } from "@/components/bklit/pie-slice"
import { PieCenter } from "@/components/bklit/pie-center"
import { ChartTooltip, TooltipContent } from "@/components/bklit/tooltip"
import { XAxis } from "@/components/bklit/x-axis"
import { YAxis } from "@/components/bklit/y-axis"
import type { DatasetAnalysis } from "@/lib/engine/types"
import { exportedStartsByDay, sourceDateLabel } from "./chart-data"

export function OverviewCharts({
  analysis,
  inScope,
  engineerReview,
}: {
  analysis: DatasetAnalysis
  inScope: number
  engineerReview: number
}) {
  const id = useId()
  const reduceMotion = useReducedMotion()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const days = useMemo(() => exportedStartsByDay(analysis), [analysis])
  const scopes = useMemo(
    () => [
      {
        label: "In scope",
        value: inScope,
        maxValue: inScope + engineerReview,
        color: "var(--chart-1)",
      },
      {
        label: "Engineer review",
        value: engineerReview,
        maxValue: inScope + engineerReview,
        color: "var(--chart-2)",
      },
    ],
    [inScope, engineerReview]
  )
  const periodDays = days[0]?.periodDays ?? 1
  const starts = days.reduce((total, day) => total + day.starts, 0)

  return (
    <div className="overview-chart-grid" aria-label="Dataset overview charts">
      <figure className="scope-overview" aria-labelledby={`${id}-scope`}>
        <div className="bklit-chart scope-donut" aria-hidden="true">
          <PieChart
            data={scopes}
            size={160}
            innerRadius={50}
            hoverOffset={6}
            hoveredIndex={hoveredIndex}
            onHoverChange={setHoveredIndex}
          >
            {scopes.map((item, index) => (
              <PieSlice
                key={item.label}
                index={index}
                animate={false}
                hoverEffect={reduceMotion ? "none" : "grow"}
              />
            ))}
            <PieCenter defaultLabel="Workflows">
              {({ value, label }) => (
                <div className="scope-center">
                  <span className="scope-center-value">{value}</span>
                  <span className="scope-center-label">{label}</span>
                </div>
              )}
            </PieCenter>
          </PieChart>
        </div>
        <figcaption className="scope-caption">
          <h3 id={`${id}-scope`}>Migration scope</h3>
          <Legend
            className="scope-legend"
            items={scopes}
            hoveredIndex={hoveredIndex}
            onHoverChange={setHoveredIndex}
          >
            <LegendItem className="scope-legend-item">
              <LegendPreview />
            </LegendItem>
          </Legend>
        </figcaption>
      </figure>
      <figure className="volume-overview" aria-labelledby={`${id}-starts`}>
        <figcaption className="volume-heading">
          <h3 id={`${id}-starts`} className="font-medium text-foreground">
            {periodDays === 1
              ? "Exported run starts"
              : `Exported starts · ${periodDays}-day groups`}
          </h3>
          <span className="text-muted-foreground tabular-nums">
            {starts.toLocaleString()} starts
          </span>
        </figcaption>
        {days.length ? (
          <div
            className="bklit-chart volume-plot"
            role="img"
            aria-label={`${starts.toLocaleString()} unique valid exported starts from ${days[0].sourceDay} to ${days.at(-1)!.sourceEndDay}. Zero dates mean no exported starts, not confirmed inactivity.`}
          >
            <AreaChart
              data={days}
              allowTouchScroll
              formatXLabel={sourceDateLabel}
              animationDuration={0}
              yDomainTween={false}
              style={{ height: 152, aspectRatio: "auto" }}
              margin={{ top: 10, right: 18, bottom: 28, left: 32 }}
            >
              <Area
                dataKey="starts"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.6}
                gradientToOpacity={0}
                fadeEdges
                strokeWidth={2}
                curve={curveLinear}
                animate={false}
                showHighlight={false}
              />
              <XAxis
                numTicks={3}
                tickMode="data"
                labels={days.map((day) => sourceDateLabel(day.date))}
              />
              <YAxis
                numTicks={2}
                formatLargeNumbers={false}
                formatValue={(value) => (value === 0 ? "" : String(value))}
              />
              <ChartTooltip
                showDatePill={false}
                showDots={false}
                damping={0}
                exit={false}
                content={({ point }) => (
                  <TooltipContent
                    title={`${String(point.sourceDay)}${point.sourceDay !== point.sourceEndDay ? ` – ${String(point.sourceEndDay)}` : ""}`}
                    rows={[
                      {
                        color: "var(--chart-1)",
                        label: "Starts",
                        value: Number(point.starts),
                      },
                    ]}
                  />
                )}
              />
            </AreaChart>
          </div>
        ) : (
          <p className="volume-empty">No valid start timestamps to chart.</p>
        )}
      </figure>
    </div>
  )
}

const formatShare = (value: number) => `${Number(value.toFixed(1))}%`

// Use the same Bklit hover context for pointer, keyboard focus and touch preview.
function LegendPreview() {
  const { setHoveredIndex } = useLegend()
  const { item, index, percentage, isHovered } = useLegendItem()
  return (
    <Button
      variant="ghost"
      className="scope-legend-preview"
      aria-label={`${item.label}: ${item.value} workflows, ${formatShare(percentage)}`}
      aria-pressed={isHovered}
      onFocus={() => setHoveredIndex(index)}
      onBlur={() => setHoveredIndex(null)}
      onClick={() => setHoveredIndex(index)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setHoveredIndex(null)
      }}
    >
      <LegendMarker className="h-2 w-2" />
      <LegendLabel className="min-w-0 flex-1 text-left text-[13px] font-normal" />
      <LegendValue
        className="text-[13px]"
        percentageClassName="scope-share"
        formatPercentage={formatShare}
        showPercentage
      />
    </Button>
  )
}

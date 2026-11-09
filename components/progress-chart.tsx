"use client";

import { format } from "date-fns";
import { useEffect, useMemo, useRef } from "react";
import { CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { Weight } from "@/db/schema";
import {
  isWindowPreset,
  WINDOW_PRESETS,
  type WindowPreset,
  windowStartDay,
} from "@/lib/chart-window";
import { parseDay } from "@/lib/dates";
import { type DayPoint, niceDomain } from "@/lib/trend";
import {
  displayWeight,
  kgToUnit,
  roundForUnit,
  type WeightUnit,
} from "@/lib/units";

const chartConfig = {
  trend: { label: "Trend", color: "var(--foreground)" },
  daily: { label: "Daily", color: "var(--chart-1)" },
} satisfies ChartConfig;

// Only the window preset is persisted. Older saved prefs (v1/v2) also carried
// series toggles; those keys are simply ignored now.
const PREFS_KEY = "bfit.progress-chart-prefs";
const PREFS_VERSION = 3;

interface ChartPrefs {
  version: number;
  windowPreset: WindowPreset;
}

function loadPrefs(): Partial<ChartPrefs> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePrefs(prefs: ChartPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore (private browsing, storage disabled, etc.)
  }
}

interface ChartRow {
  date: number; // calendar-day timestamp, so the axis spaces points by real elapsed time
  trend?: number;
  daily?: number;
}

// One row per calendar day holding both series, so the tooltip shows the
// trend and the day's weigh-in together. Positioned on a real time scale (not
// a category axis): a gap in logging stretches that stretch of the line
// instead of connecting distant entries as if adjacent.
function buildChartRows(
  weights: Weight[],
  trend: DayPoint[],
  unit: WeightUnit,
): ChartRow[] {
  const rows = new Map<number, ChartRow>();
  const upsert = (key: number, fields: Partial<ChartRow>) => {
    const existing = rows.get(key);
    if (existing) {
      Object.assign(existing, fields);
    } else {
      rows.set(key, { date: key, ...fields });
    }
  };

  for (const p of trend) {
    upsert(parseDay(p.day).getTime(), {
      trend: roundForUnit(kgToUnit(p.kg, unit), unit),
    });
  }
  for (const w of weights) {
    upsert(parseDay(w.date).getTime(), {
      daily: displayWeight(w.value, unit),
    });
  }

  return [...rows.values()].sort((a, b) => a.date - b.date);
}

const formatTick = (value: number) => format(new Date(value), "MMM d");

export function Chart({
  weights,
  trend,
  unit,
  windowPreset,
  onWindowPresetChange: setWindowPreset,
}: {
  weights: Weight[];
  /** EWMA trend in kg, one point per logged day (see lib/trend.ts). */
  trend: DayPoint[];
  unit: WeightUnit;
  /** Controlled so the dashboard summary can follow the same window. */
  windowPreset: WindowPreset;
  onWindowPresetChange: (preset: WindowPreset) => void;
}) {
  const hasLoadedPrefs = useRef(false);

  // Prefs are read from localStorage after mount (not in useState's
  // initializer) so the server-rendered markup matches the client's first
  // render before hydration swaps in the saved values.
  useEffect(() => {
    const prefs = loadPrefs();
    if (isWindowPreset(prefs.windowPreset)) {
      setWindowPreset(prefs.windowPreset);
    }
    hasLoadedPrefs.current = true;
    // setWindowPreset is the parent's (stable) state setter: runs once.
  }, [setWindowPreset]);

  useEffect(() => {
    if (!hasLoadedPrefs.current) return;
    savePrefs({ version: PREFS_VERSION, windowPreset });
  }, [windowPreset]);

  const allRows = useMemo(
    () => buildChartRows(weights, trend, unit),
    [weights, trend, unit],
  );

  // Same cutoff day as the dashboard summary's window change.
  const cutoff = useMemo(() => {
    const lastDay = weights.reduce<string | null>(
      (max, w) => (max === null || w.date > max ? w.date : max),
      null,
    );
    const start = windowStartDay(lastDay, windowPreset);
    return start === null ? null : parseDay(start).getTime();
  }, [weights, windowPreset]);

  const chartData = useMemo(
    () =>
      cutoff === null ? allRows : allRows.filter((r) => r.date >= cutoff),
    [allRows, cutoff],
  );

  const xDomain = useMemo((): [number, number] | undefined => {
    if (chartData.length === 0) return undefined;
    return [chartData[0].date, chartData[chartData.length - 1].date];
  }, [chartData]);

  // Weight axis bounds from both series, rounded to nice steps.
  const yAxis = useMemo(() => {
    const values = chartData.flatMap((r) =>
      [r.trend, r.daily].filter((v): v is number => v !== undefined),
    );
    if (values.length === 0) return null;
    return niceDomain(Math.min(...values), Math.max(...values));
  }, [chartData]);

  return (
    <Card className="flex h-[460px] w-full min-w-0 flex-col gap-4 sm:h-[520px] lg:h-full">
      <CardHeader className="flex flex-wrap items-center gap-2">
        <CardTitle className="mr-auto">Progress</CardTitle>
        <fieldset className="flex flex-wrap gap-1">
          <legend className="sr-only">Window</legend>
          {WINDOW_PRESETS.map((preset) => (
            <Button
              key={preset}
              size="sm"
              variant={windowPreset === preset ? "secondary" : "ghost"}
              aria-pressed={windowPreset === preset}
              onClick={() => setWindowPreset(preset)}
            >
              {preset}
            </Button>
          ))}
        </fieldset>
      </CardHeader>
      <CardContent className="w-full flex flex-1 flex-col min-h-0">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto flex-1 min-h-0"
        >
          <ComposedChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 0, right: 8 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              type="number"
              domain={xDomain ?? ["dataMin", "dataMax"]}
              allowDuplicatedCategory={false}
              scale="time"
              axisLine={false}
              tickLine={false}
              tickFormatter={formatTick}
              tickMargin={8}
              minTickGap={32}
              height={28}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              domain={yAxis?.domain ?? ["auto", "auto"]}
              ticks={yAxis?.ticks}
              allowDataOverflow
            />
            <ChartTooltip
              cursor={false}
              labelFormatter={(_value, payload) => {
                const ts = payload?.[0]?.payload?.date;
                return typeof ts === "number"
                  ? format(new Date(ts), "PPP")
                  : "";
              }}
              content={<ChartTooltipContent />}
            />
            <Line
              name="daily"
              dataKey="daily"
              type="monotone"
              stroke="var(--color-daily)"
              strokeWidth={1}
              strokeOpacity={0.5}
              dot={{ r: 2 }}
              connectNulls
            />
            <Line
              name="trend"
              dataKey="trend"
              type="monotone"
              stroke="var(--color-trend)"
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

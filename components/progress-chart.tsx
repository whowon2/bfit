"use client";

import { format, startOfMonth, startOfWeek } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
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
  weekly: { label: "Weekly", color: "var(--chart-2)" },
  monthly: { label: "Monthly", color: "var(--chart-3)" },
} satisfies ChartConfig;

const AVERAGES = ["trend", "daily", "weekly", "monthly"] as const;
type Average = (typeof AVERAGES)[number];
const DEFAULT_AVERAGES: Average[] = ["trend", "daily"];

const PREFS_KEY = "bfit.progress-chart-prefs";
// v2 added the trend series; older saved prefs get it switched on once.
const PREFS_VERSION = 2;

interface ChartPrefs {
  version: number;
  windowPreset: WindowPreset;
  visibleAvgs: Average[];
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

interface DailyPoint {
  date: number; // timestamp, so the axis can space points by real elapsed time
  daily: number;
}

interface TrendPoint {
  date: number;
  trend: number;
}

interface PeriodPoint {
  date: number; // period start timestamp
  value: number;
}

interface ChartRow {
  date: number;
  trend?: number;
  daily?: number;
  weekly?: number;
  monthly?: number;
}

// Every series is merged into one row per calendar day so all lines share a
// single x index space (tooltip shows every visible series for the hovered
// day). Every point's `date` is already a stored calendar day (local midnight
// via parseDay), so rows key on it directly.
function mergeChartRows(
  trendPoints: TrendPoint[],
  dailyPoints: DailyPoint[],
  weeklyPoints: PeriodPoint[],
  monthlyPoints: PeriodPoint[],
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

  for (const p of trendPoints) upsert(p.date, { trend: p.trend });
  for (const p of dailyPoints) upsert(p.date, { daily: p.daily });
  for (const p of weeklyPoints) upsert(p.date, { weekly: p.value });
  for (const p of monthlyPoints) upsert(p.date, { monthly: p.value });

  return [...rows.values()].sort((a, b) => a.date - b.date);
}

// One point per actual log entry, positioned on a real time scale (not a
// category axis) — a week without a log just stretches that segment of the
// line horizontally instead of connecting distant entries as if adjacent.
function buildDailyPoints(weights: Weight[]): DailyPoint[] {
  // Keyed by the stored calendar day (not the weigh-in time) — see
  // mergeChartRows.
  return [...weights]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({
      date: parseDay(w.date).getTime(),
      daily: Number(w.value),
    }));
}

// Groups entries by calendar period (week/month) and collapses each group to
// a single averaged point, positioned at the period's start — a true
// per-period aggregate rather than a per-entry rolling average.
function buildPeriodPoints(
  weights: Weight[],
  periodStart: (date: Date) => Date,
  unit: WeightUnit,
): PeriodPoint[] {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));

  const groups = new Map<number, number[]>();
  for (const w of sorted) {
    const key = periodStart(parseDay(w.date)).getTime();
    const group = groups.get(key);
    if (group) {
      group.push(Number(w.value));
    } else {
      groups.set(key, [Number(w.value)]);
    }
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([date, values]) => ({
      date,
      value: roundForUnit(
        values.reduce((sum, v) => sum + v, 0) / values.length,
        unit,
      ),
    }));
}

function buildWeeklyPoints(weights: Weight[], unit: WeightUnit): PeriodPoint[] {
  return buildPeriodPoints(
    weights,
    (date) => startOfWeek(date, { weekStartsOn: 1 }),
    unit,
  );
}

function buildMonthlyPoints(
  weights: Weight[],
  unit: WeightUnit,
): PeriodPoint[] {
  return buildPeriodPoints(weights, startOfMonth, unit);
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
  const [visibleAvgs, setVisibleAvgs] = useState<Set<Average>>(
    new Set(DEFAULT_AVERAGES),
  );
  const hasLoadedPrefs = useRef(false);

  // Prefs are read from localStorage after mount (not in useState's
  // initializer) so the server-rendered markup matches the client's first
  // render before hydration swaps in the saved values.
  useEffect(() => {
    const prefs = loadPrefs();
    if (isWindowPreset(prefs.windowPreset)) {
      setWindowPreset(prefs.windowPreset);
    }
    if (Array.isArray(prefs.visibleAvgs)) {
      const saved = prefs.visibleAvgs.filter((a) => AVERAGES.includes(a));
      if ((prefs.version ?? 1) < PREFS_VERSION) saved.unshift("trend");
      setVisibleAvgs(new Set(saved));
    }
    hasLoadedPrefs.current = true;
    // setWindowPreset is the parent's (stable) state setter: runs once.
  }, [setWindowPreset]);

  useEffect(() => {
    if (!hasLoadedPrefs.current) return;
    savePrefs({
      version: PREFS_VERSION,
      windowPreset,
      visibleAvgs: [...visibleAvgs],
    });
  }, [windowPreset, visibleAvgs]);

  // Stored values are kg; convert once so every weight series is in the
  // user's unit.
  const unitWeights = useMemo(
    () =>
      weights.map((w) => ({
        ...w,
        value: String(displayWeight(w.value, unit)),
      })),
    [weights, unit],
  );

  const dailyData = useMemo(() => buildDailyPoints(unitWeights), [unitWeights]);
  const trendData = useMemo(
    (): TrendPoint[] =>
      trend.map((p) => ({
        date: parseDay(p.day).getTime(),
        trend: roundForUnit(kgToUnit(p.kg, unit), unit),
      })),
    [trend, unit],
  );
  const weeklyData = useMemo(
    () => buildWeeklyPoints(unitWeights, unit),
    [unitWeights, unit],
  );
  const monthlyData = useMemo(
    () => buildMonthlyPoints(unitWeights, unit),
    [unitWeights, unit],
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

  const visibleTrendData = useMemo(() => {
    if (cutoff === null) return trendData;
    return trendData.filter((p) => p.date >= cutoff);
  }, [trendData, cutoff]);

  const visibleData = useMemo(() => {
    if (cutoff === null) return dailyData;
    return dailyData.filter((p) => p.date >= cutoff);
  }, [dailyData, cutoff]);

  const visibleWeeklyData = useMemo(() => {
    if (cutoff === null) return weeklyData;
    return weeklyData.filter((p) => p.date >= cutoff);
  }, [weeklyData, cutoff]);

  const visibleMonthlyData = useMemo(() => {
    if (cutoff === null) return monthlyData;
    return monthlyData.filter((p) => p.date >= cutoff);
  }, [monthlyData, cutoff]);

  // Only series that are toggled on (and have points in the window) feed the
  // shared rows and the x-axis extent — otherwise e.g. a hidden monthly point
  // on the 1st of the month stretches the axis. Recharts widens an explicit
  // numeric domain to fit the data, so hidden series must be left out of the
  // rows too, not just the domain. With nothing visible, fall back to all.
  const shownSeries = useMemo(() => {
    const all = {
      trend: visibleTrendData,
      daily: visibleData,
      weekly: visibleWeeklyData,
      monthly: visibleMonthlyData,
    };
    const shown = {
      trend: visibleAvgs.has("trend") ? all.trend : [],
      daily: visibleAvgs.has("daily") ? all.daily : [],
      weekly: visibleAvgs.has("weekly") ? all.weekly : [],
      monthly: visibleAvgs.has("monthly") ? all.monthly : [],
    };
    const anyShown = Object.values(shown).some((s) => s.length > 0);
    return anyShown ? shown : all;
  }, [
    visibleAvgs,
    visibleTrendData,
    visibleData,
    visibleWeeklyData,
    visibleMonthlyData,
  ]);

  const chartData = useMemo(
    () =>
      mergeChartRows(
        shownSeries.trend,
        shownSeries.daily,
        shownSeries.weekly,
        shownSeries.monthly,
      ),
    [shownSeries],
  );

  const xDomain = useMemo((): [number, number] | undefined => {
    const dates = Object.values(shownSeries).flatMap((s) =>
      s.map((p) => p.date),
    );
    if (dates.length === 0) return undefined;
    return [Math.min(...dates), Math.max(...dates)];
  }, [shownSeries]);

  // Weight axis bounds from the visible weight series, rounded to nice steps.
  const yAxis = useMemo(() => {
    const values = [
      ...(visibleAvgs.has("trend") ? visibleTrendData.map((p) => p.trend) : []),
      ...(visibleAvgs.has("daily") ? visibleData.map((p) => p.daily) : []),
      ...(visibleAvgs.has("weekly")
        ? visibleWeeklyData.map((p) => p.value)
        : []),
      ...(visibleAvgs.has("monthly")
        ? visibleMonthlyData.map((p) => p.value)
        : []),
    ];
    if (values.length === 0) return null;
    return niceDomain(Math.min(...values), Math.max(...values));
  }, [
    visibleAvgs,
    visibleTrendData,
    visibleData,
    visibleWeeklyData,
    visibleMonthlyData,
  ]);

  function toggleAverage(avg: Average) {
    setVisibleAvgs((prev) => {
      const next = new Set(prev);
      if (next.has(avg)) {
        next.delete(avg);
      } else {
        next.add(avg);
      }
      return next;
    });
  }

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
        <fieldset className="flex flex-wrap gap-1 pb-3">
          <legend className="sr-only">Series</legend>
          {AVERAGES.map((avg) => (
            <Button
              key={avg}
              size="sm"
              variant={visibleAvgs.has(avg) ? "default" : "outline"}
              aria-pressed={visibleAvgs.has(avg)}
              onClick={() => toggleAverage(avg)}
            >
              {chartConfig[avg].label}
            </Button>
          ))}
        </fieldset>

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
            {visibleAvgs.has("daily") && (
              <Line
                name="daily"
                dataKey="daily"
                type="monotone"
                stroke="var(--color-daily)"
                strokeWidth={visibleAvgs.has("trend") ? 1 : 2}
                strokeOpacity={visibleAvgs.has("trend") ? 0.5 : 1}
                dot={{ r: 2 }}
                connectNulls
              />
            )}
            {visibleAvgs.has("trend") && (
              <Line
                name="trend"
                dataKey="trend"
                type="monotone"
                stroke="var(--color-trend)"
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
            )}
            {visibleAvgs.has("weekly") && (
              <Line
                name="weekly"
                dataKey="weekly"
                type="monotone"
                stroke="var(--color-weekly)"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            )}
            {visibleAvgs.has("monthly") && (
              <Line
                name="monthly"
                dataKey="monthly"
                type="monotone"
                stroke="var(--color-monthly)"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            )}
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

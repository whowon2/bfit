"use client";

import { format, startOfDay, startOfMonth, startOfWeek, sub } from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  type XAxisTickContentProps,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { CalorieLog, Weight } from "@/db/schema";

export const description = "A multiple line chart";

const chartConfig = {
  daily: { label: "Daily", color: "var(--chart-1)" },
  weekly: { label: "Weekly", color: "var(--chart-2)" },
  monthly: { label: "Monthly", color: "var(--chart-3)" },
  calories: { label: "Calories", color: "var(--chart-4)" },
  bodyFat: { label: "Body fat", color: "var(--chart-5)" },
} satisfies ChartConfig;

const AVERAGES = ["daily", "weekly", "monthly"] as const;
type Average = (typeof AVERAGES)[number];

const WINDOW_PRESETS = ["1M", "3M", "6M", "1Y", "All"] as const;
type WindowPreset = (typeof WINDOW_PRESETS)[number];

const WINDOW_MONTHS: Record<Exclude<WindowPreset, "All">, number> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
};

const SYNC_ID = "progress-chart";
const PREFS_KEY = "bfit.progress-chart-prefs";

interface ChartPrefs {
  windowPreset: WindowPreset;
  visibleAvgs: Average[];
  showCalories: boolean;
  showBodyFat: boolean;
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

interface PeriodPoint {
  date: number; // period start timestamp
  value: number;
}

interface CaloriePoint {
  date: number;
  calories: number;
}

interface BodyFatPoint {
  date: number;
  bodyFat: number;
}

interface ChartRow {
  date: number;
  daily?: number;
  weekly?: number;
  monthly?: number;
  calories?: number;
  bodyFat?: number;
}

// recharts' syncId links two charts by forwarding the hovered row's index
// verbatim (it doesn't re-match by date) — and a chart's hover index space is
// the *combined* set of x-positions across every series sharing its axis, so
// a Line rendered with its own separate `data` override (like weekly/monthly
// used to be) shifts that chart's index space out of step with a chart that
// doesn't have those extra series. Merging every series — daily, weekly,
// monthly, calories, body fat — into one row per calendar day (not exact
// timestamp, since a weigh-in's time-of-day never lines up with a calorie
// import's midnight) keeps both panels' index spaces identical.
function mergeChartRows(
  dailyPoints: DailyPoint[],
  weeklyPoints: PeriodPoint[],
  monthlyPoints: PeriodPoint[],
  caloriePoints: CaloriePoint[],
  bodyFatPoints: BodyFatPoint[],
): ChartRow[] {
  const rows = new Map<number, ChartRow>();
  const upsert = (date: number, fields: Partial<ChartRow>) => {
    const key = startOfDay(date).getTime();
    const existing = rows.get(key);
    if (existing) {
      Object.assign(existing, fields);
    } else {
      rows.set(key, { date: key, ...fields });
    }
  };

  for (const p of dailyPoints) upsert(p.date, { daily: p.daily });
  for (const p of weeklyPoints) upsert(p.date, { weekly: p.value });
  for (const p of monthlyPoints) upsert(p.date, { monthly: p.value });
  for (const p of caloriePoints) upsert(p.date, { calories: p.calories });
  for (const p of bodyFatPoints) upsert(p.date, { bodyFat: p.bodyFat });

  return [...rows.values()].sort((a, b) => a.date - b.date);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// One point per actual log entry, positioned on a real time scale (not a
// category axis) — a week without a log just stretches that segment of the
// line horizontally instead of connecting distant entries as if adjacent.
function buildDailyPoints(weights: Weight[]): DailyPoint[] {
  // Normalized to day granularity (not the exact log timestamp) so it merges
  // cleanly with calorie/body-fat rows keyed by day — see mergeChartRows.
  return [...weights]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((w) => ({
      date: startOfDay(w.date).getTime(),
      daily: Number(w.value),
    }));
}

// Groups entries by calendar period (week/month) and collapses each group to
// a single averaged point, positioned at the period's start — a true
// per-period aggregate rather than a per-entry rolling average.
function buildPeriodPoints(
  weights: Weight[],
  periodStart: (date: Date) => Date,
): PeriodPoint[] {
  const sorted = [...weights].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  const groups = new Map<number, number[]>();
  for (const w of sorted) {
    const key = periodStart(w.date).getTime();
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
      value: round2(values.reduce((sum, v) => sum + v, 0) / values.length),
    }));
}

function buildWeeklyPoints(weights: Weight[]): PeriodPoint[] {
  return buildPeriodPoints(weights, (date) =>
    startOfWeek(date, { weekStartsOn: 1 }),
  );
}

function buildMonthlyPoints(weights: Weight[]): PeriodPoint[] {
  return buildPeriodPoints(weights, startOfMonth);
}

function buildCaloriePoints(entries: CalorieLog[]): CaloriePoint[] {
  return entries
    .filter((e) => e.actualCalories !== null)
    .map((e) => ({
      date: e.date.getTime(),
      calories: Number(e.actualCalories),
    }))
    .sort((a, b) => a.date - b.date);
}

function buildBodyFatPoints(weights: Weight[]): BodyFatPoint[] {
  return weights
    .filter((w) => w.bodyFatPercent !== null)
    .map((w) => ({
      date: w.date.getTime(),
      bodyFat: Number(w.bodyFatPercent),
    }))
    .sort((a, b) => a.date - b.date);
}

const CustomizedAxisTick = ({ x, y, payload }: XAxisTickContentProps) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#666"
        transform="rotate(-55)"
      >
        {format(new Date(Number(payload.value)), "dd/MM/yyyy")}
      </text>
    </g>
  );
};

export function Chart({
  weights,
  calories,
  unit,
}: {
  weights: Weight[];
  calories: CalorieLog[];
  unit: string;
}) {
  const [windowPreset, setWindowPreset] = useState<WindowPreset>("1Y");
  const [visibleAvgs, setVisibleAvgs] = useState<Set<Average>>(
    new Set(AVERAGES),
  );
  const [showCalories, setShowCalories] = useState(true);
  const [showBodyFat, setShowBodyFat] = useState(true);
  const hasLoadedPrefs = useRef(false);

  // Prefs are read from localStorage after mount (not in useState's
  // initializer) so the server-rendered markup matches the client's first
  // render before hydration swaps in the saved values.
  useEffect(() => {
    const prefs = loadPrefs();
    if (prefs.windowPreset && WINDOW_PRESETS.includes(prefs.windowPreset)) {
      setWindowPreset(prefs.windowPreset);
    }
    if (prefs.visibleAvgs) {
      setVisibleAvgs(
        new Set(prefs.visibleAvgs.filter((a) => AVERAGES.includes(a))),
      );
    }
    if (typeof prefs.showCalories === "boolean") {
      setShowCalories(prefs.showCalories);
    }
    if (typeof prefs.showBodyFat === "boolean") {
      setShowBodyFat(prefs.showBodyFat);
    }
    hasLoadedPrefs.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedPrefs.current) return;
    savePrefs({
      windowPreset,
      visibleAvgs: [...visibleAvgs],
      showCalories,
      showBodyFat,
    });
  }, [windowPreset, visibleAvgs, showCalories, showBodyFat]);

  const dailyData = useMemo(() => buildDailyPoints(weights), [weights]);
  const weeklyData = useMemo(() => buildWeeklyPoints(weights), [weights]);
  const monthlyData = useMemo(() => buildMonthlyPoints(weights), [weights]);
  const calorieData = useMemo(() => buildCaloriePoints(calories), [calories]);
  const bodyFatData = useMemo(() => buildBodyFatPoints(weights), [weights]);

  const cutoff = useMemo(() => {
    if (windowPreset === "All" || dailyData.length === 0) return null;
    const last = dailyData[dailyData.length - 1].date;
    return sub(new Date(last), {
      months: WINDOW_MONTHS[windowPreset],
    }).getTime();
  }, [dailyData, windowPreset]);

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

  const visibleCalorieData = useMemo(() => {
    if (cutoff === null) return calorieData;
    return calorieData.filter((p) => p.date >= cutoff);
  }, [calorieData, cutoff]);

  const visibleBodyFatData = useMemo(() => {
    if (cutoff === null) return bodyFatData;
    return bodyFatData.filter((p) => p.date >= cutoff);
  }, [bodyFatData, cutoff]);

  const chartData = useMemo(
    () =>
      mergeChartRows(
        visibleData,
        visibleWeeklyData,
        visibleMonthlyData,
        visibleCalorieData,
        visibleBodyFatData,
      ),
    [
      visibleData,
      visibleWeeklyData,
      visibleMonthlyData,
      visibleCalorieData,
      visibleBodyFatData,
    ],
  );

  const hasIndicators =
    (showCalories && visibleCalorieData.length > 0) ||
    (showBodyFat && visibleBodyFatData.length > 0);

  const xDomain = useMemo((): [number, number] | undefined => {
    const dates = [
      ...visibleData.map((p) => p.date),
      ...visibleWeeklyData.map((p) => p.date),
      ...visibleMonthlyData.map((p) => p.date),
      ...visibleCalorieData.map((p) => p.date),
      ...visibleBodyFatData.map((p) => p.date),
    ];
    if (dates.length === 0) return undefined;
    return [Math.min(...dates), Math.max(...dates)];
  }, [
    visibleData,
    visibleWeeklyData,
    visibleMonthlyData,
    visibleCalorieData,
    visibleBodyFatData,
  ]);

  const trend = useMemo(() => {
    if (visibleData.length < 2) return null;
    const first = visibleData[0].daily;
    const last = visibleData[visibleData.length - 1].daily;
    const delta = Math.round((last - first) * 100) / 100;
    const pct = first !== 0 ? Math.round((delta / first) * 1000) / 10 : 0;
    return { delta, pct };
  }, [visibleData]);

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
    <Card className="w-full flex flex-col h-[500px] lg:h-full lg:flex-1">
      <CardHeader>
        <CardTitle>Progress</CardTitle>
        <CardAction className="flex gap-1">
          {AVERAGES.map((avg) => (
            <Button
              key={avg}
              size="sm"
              variant={visibleAvgs.has(avg) ? "default" : "outline"}
              onClick={() => toggleAverage(avg)}
            >
              {chartConfig[avg].label}
            </Button>
          ))}
          {calorieData.length > 0 && (
            <Button
              size="sm"
              variant={showCalories ? "default" : "outline"}
              onClick={() => setShowCalories((prev) => !prev)}
            >
              {chartConfig.calories.label}
            </Button>
          )}
          {bodyFatData.length > 0 && (
            <Button
              size="sm"
              variant={showBodyFat ? "default" : "outline"}
              onClick={() => setShowBodyFat((prev) => !prev)}
            >
              {chartConfig.bodyFat.label}
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="w-full flex flex-1 flex-col min-h-0">
        <div className="flex gap-1 pb-4">
          {WINDOW_PRESETS.map((preset) => (
            <Button
              key={preset}
              size="sm"
              variant={windowPreset === preset ? "default" : "outline"}
              onClick={() => setWindowPreset(preset)}
            >
              {preset}
            </Button>
          ))}
        </div>

        <ChartContainer
          config={chartConfig}
          className={
            hasIndicators
              ? "aspect-auto flex-[3] min-h-0"
              : "aspect-auto flex-1 min-h-0"
          }
        >
          <ComposedChart
            accessibilityLayer
            syncId={SYNC_ID}
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              type="number"
              domain={xDomain ?? ["dataMin", "dataMax"]}
              allowDuplicatedCategory={false}
              scale="time"
              tick={false}
              axisLine={false}
              tickLine={false}
              height={hasIndicators ? 4 : 100}
              {...(!hasIndicators && { tick: CustomizedAxisTick, angle: -80 })}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={40}
              domain={["dataMin", "dataMax"]} // 🔑 dynamic range
              tickCount={10}
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
                strokeWidth={2}
                dot={{ r: 2 }}
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

        {hasIndicators && (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto flex-1 min-h-0 border-t pt-2"
          >
            <ComposedChart
              accessibilityLayer
              syncId={SYNC_ID}
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                type="number"
                domain={xDomain ?? ["dataMin", "dataMax"]}
                allowDuplicatedCategory={false}
                scale="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                height={100}
                angle={-80}
                tick={CustomizedAxisTick}
              />
              <YAxis
                yAxisId="calories"
                tickLine={false}
                axisLine={false}
                width={40}
                domain={[0, "dataMax"]}
                tickCount={4}
              />
              <YAxis
                yAxisId="bodyFat"
                orientation="right"
                width={0}
                hide
                domain={["dataMin - 1", "dataMax + 1"]}
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
              {showCalories && (
                <Bar
                  name="calories"
                  dataKey="calories"
                  yAxisId="calories"
                  fill="var(--color-calories)"
                  fillOpacity={0.8}
                  barSize={4}
                  radius={1}
                />
              )}
              {showBodyFat && (
                <Line
                  name="bodyFat"
                  dataKey="bodyFat"
                  yAxisId="bodyFat"
                  type="monotone"
                  stroke="var(--color-bodyFat)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              )}
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
      {trend && (
        <CardFooter>
          <div className="flex w-full items-start gap-2 text-sm">
            <div className="grid gap-2">
              <div className="flex items-center gap-2 leading-none font-medium">
                {trend.delta === 0
                  ? "Weight steady"
                  : trend.delta > 0
                    ? `Up ${trend.delta} ${unit} (${trend.pct}%)`
                    : `Down ${Math.abs(trend.delta)} ${unit} (${Math.abs(trend.pct)}%)`}
                {trend.delta >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
              </div>
              <div className="text-muted-foreground flex items-center gap-2 leading-none">
                Over the selected{" "}
                {windowPreset === "All" ? "history" : windowPreset} window
              </div>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

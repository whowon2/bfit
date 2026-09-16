"use client";

import { format, startOfMonth, startOfWeek, sub } from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
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
import type { Weight } from "@/db/schema";

export const description = "A multiple line chart";

const chartConfig = {
  daily: { label: "Daily", color: "var(--chart-1)" },
  weekly: { label: "Weekly", color: "var(--chart-2)" },
  monthly: { label: "Monthly", color: "var(--chart-3)" },
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

interface DailyPoint {
  date: number; // timestamp, so the axis can space points by real elapsed time
  daily: number;
}

interface PeriodPoint {
  date: number; // period start timestamp
  value: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// One point per actual log entry, positioned on a real time scale (not a
// category axis) — a week without a log just stretches that segment of the
// line horizontally instead of connecting distant entries as if adjacent.
function buildDailyPoints(weights: Weight[]): DailyPoint[] {
  return [...weights]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((w) => ({ date: w.date.getTime(), daily: Number(w.value) }));
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

export function Chart({ weights, unit }: { weights: Weight[]; unit: string }) {
  const [windowPreset, setWindowPreset] = useState<WindowPreset>("1Y");
  const [visibleAvgs, setVisibleAvgs] = useState<Set<Average>>(
    new Set(AVERAGES),
  );

  const dailyData = useMemo(() => buildDailyPoints(weights), [weights]);
  const weeklyData = useMemo(() => buildWeeklyPoints(weights), [weights]);
  const monthlyData = useMemo(() => buildMonthlyPoints(weights), [weights]);

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

  const xDomain = useMemo((): [number, number] | undefined => {
    const dates = [
      ...visibleData.map((p) => p.date),
      ...visibleWeeklyData.map((p) => p.date),
      ...visibleMonthlyData.map((p) => p.date),
    ];
    if (dates.length === 0) return undefined;
    return [Math.min(...dates), Math.max(...dates)];
  }, [visibleData, visibleWeeklyData, visibleMonthlyData]);

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
          className="aspect-auto flex-1 min-h-0"
        >
          <LineChart
            accessibilityLayer
            data={visibleData}
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
              />
            )}
            {visibleAvgs.has("weekly") && (
              <Line
                name="weekly"
                data={visibleWeeklyData}
                dataKey="value"
                type="monotone"
                stroke="var(--color-weekly)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            )}
            {visibleAvgs.has("monthly") && (
              <Line
                name="monthly"
                data={visibleMonthlyData}
                dataKey="value"
                type="monotone"
                stroke="var(--color-monthly)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            )}
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </LineChart>
        </ChartContainer>
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

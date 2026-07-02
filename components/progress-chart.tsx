"use client";

import { format, sub, subDays } from "date-fns";
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

interface ChartPoint {
  date: number; // timestamp, so the axis can space points by real elapsed time
  daily: number;
  weekly: number;
  monthly: number;
}

// One point per actual log entry, positioned on a real time scale (not a
// category axis) — a week without a log just stretches that segment of the
// line horizontally instead of connecting distant entries as if adjacent.
function buildChartData(weights: Weight[]): ChartPoint[] {
  if (weights.length === 0) return [];

  const sorted = [...weights].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  // Trailing averages over the real last 7/30 days (not entry count), via a
  // two-pointer sliding window — O(n). Computed over the full history so a
  // later time-window filter doesn't skew the average at the window's edge.
  let weekLo = 0;
  let monthLo = 0;
  let weekSum = 0;
  let monthSum = 0;

  return sorted.map((w, i) => {
    const date = w.date;
    const weekStart = subDays(date, 6);
    const monthStart = subDays(date, 29);

    weekSum += Number(w.value);
    monthSum += Number(w.value);
    while (weekLo < i && sorted[weekLo].date < weekStart) {
      weekSum -= Number(sorted[weekLo].value);
      weekLo++;
    }
    while (monthLo < i && sorted[monthLo].date < monthStart) {
      monthSum -= Number(sorted[monthLo].value);
      monthLo++;
    }

    return {
      date: date.getTime(),
      daily: Number(w.value),
      // Round off float drift from the running +=/-= sum (e.g. 89.99999999997
      // instead of 90) — weight values only ever have 2 decimal places anyway.
      weekly: Math.round((weekSum / (i - weekLo + 1)) * 100) / 100,
      monthly: Math.round((monthSum / (i - monthLo + 1)) * 100) / 100,
    };
  });
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
        {format(new Date(Number(payload.value)), "yy-MM-dd")}
      </text>
    </g>
  );
};

export function Chart({ weights }: { weights: Weight[] }) {
  const [windowPreset, setWindowPreset] = useState<WindowPreset>("All");
  const [visibleAvgs, setVisibleAvgs] = useState<Set<Average>>(
    new Set(AVERAGES),
  );

  const chartData = useMemo(() => buildChartData(weights), [weights]);

  const visibleData = useMemo(() => {
    if (windowPreset === "All" || chartData.length === 0) return chartData;
    const last = chartData[chartData.length - 1].date;
    const cutoff = sub(new Date(last), {
      months: WINDOW_MONTHS[windowPreset],
    }).getTime();
    return chartData.filter((p) => p.date >= cutoff);
  }, [chartData, windowPreset]);

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
    <Card className="w-full">
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
      <CardContent className="w-full">
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
        <ChartContainer config={chartConfig}>
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
              domain={["dataMin", "dataMax"]}
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
                dataKey="daily"
                type="monotone"
                stroke="var(--color-daily)"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            )}
            {visibleAvgs.has("weekly") && (
              <Line
                dataKey="weekly"
                type="monotone"
                stroke="var(--color-weekly)"
                strokeWidth={2}
                dot={false}
              />
            )}
            {visibleAvgs.has("monthly") && (
              <Line
                dataKey="monthly"
                type="monotone"
                stroke="var(--color-monthly)"
                strokeWidth={2}
                dot={false}
              />
            )}
            <ChartLegend content={<ChartLegendContent />} />
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
                    ? `Up ${trend.delta} (${trend.pct}%)`
                    : `Down ${Math.abs(trend.delta)} (${Math.abs(trend.pct)}%)`}
                {trend.delta >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
              </div>
              <div className="text-muted-foreground flex items-center gap-2 leading-none">
                Over the selected {windowPreset === "All" ? "history" : windowPreset} window
              </div>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

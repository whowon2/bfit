"use client";

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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

function movingAverage(weights: Weight[]) {
  // sort by date ascending
  const sorted = [...weights].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  return sorted.map((w, i, arr) => {
    // get the last `days` values including current
    const start = Math.max(0, i - 7 + 1);
    const start30 = Math.max(0, i - 30 + 1);
    const slice = arr.slice(start, i + 1);
    const slice30 = arr.slice(start30, i + 1);
    const weekly = slice.reduce((sum, x) => sum + +x.value, 0) / slice.length;
    const monthly =
      slice30.reduce((sum, x) => sum + +x.value, 0) / slice30.length;

    return {
      date: w.date.toISOString().slice(2, 10),
      daily: parseFloat(w.value),
      weekly: weekly,
      monthly: monthly,
    };
  });
}

const CustomizedAxisTick = ({
  x,
  y,
  _stroke,
  payload,
}: {
  x: number;
  y: number;
  _stroke: string;
  payload: { value: string };
}) => {
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
        {payload.value}
      </text>
    </g>
  );
};

export function Chart({ weights }: { weights: Weight[] }) {
  const chartData = movingAverage(weights);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Progress</CardTitle>
        <CardAction></CardAction>
      </CardHeader>
      <CardContent className="w-full">
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              height={100}
              tickFormatter={(value) => value.slice(0, 3)}
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
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="daily"
              type="monotone"
              stroke="var(--color-daily)"
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
            />
            <Line
              dataKey="weekly"
              type="monotone"
              stroke="var(--color-weekly)"
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
            />{" "}
            <Line
              dataKey="monthly"
              type="monotone"
              stroke="var(--color-monthly)"
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
            />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              Weight trend <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              Tracking daily, weekly and monthly weights
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

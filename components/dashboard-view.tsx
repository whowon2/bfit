"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Chart } from "@/components/progress-chart";
import { QuickLog } from "@/components/quick-log";
import {
  type MaintenanceStat,
  type NutritionSummary,
  SummaryStrip,
} from "@/components/summary-strip";
import { WeightList } from "@/components/weight-list";
import type { Weight } from "@/db/schema";
import { type WindowPreset, windowStartDay } from "@/lib/chart-window";
import { ewmaTrend, weeklyRate, windowChange } from "@/lib/trend";
import type { WeightUnit } from "@/lib/units";

/**
 * Client shell for the dashboard. Owns the chart window so the summary's
 * "change over window" follows the chart; everything that needs the DB or the
 * user's timezone (today, nutrition targets) is computed by the page.
 */
export function DashboardView({
  weights,
  unit,
  timeZone,
  today,
  latestBodyFat,
  todayCalories,
  nutrition,
  maintenance,
}: {
  /** Newest first. */
  weights: Weight[];
  unit: WeightUnit;
  timeZone: string;
  today: string;
  latestBodyFat: number | null;
  todayCalories: number | null;
  nutrition: NutritionSummary;
  maintenance: MaintenanceStat;
}) {
  const [windowPreset, setWindowPreset] = useState<WindowPreset>("1Y");

  const points = useMemo(
    () => weights.map((w) => ({ day: w.date, kg: Number(w.value) })),
    [weights],
  );
  const trend = useMemo(() => ewmaTrend(points), [points]);
  const rate = useMemo(() => weeklyRate(points), [points]);

  const latest = weights[0] ?? null;
  const lastDay = latest?.date ?? null;
  const change = useMemo(
    () => windowChange(trend, windowStartDay(lastDay, windowPreset)),
    [trend, lastDay, windowPreset],
  );
  const todayEntry = weights.find((w) => w.date === today) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-3 sm:p-4">
      <h1 className="sr-only">Dashboard</h1>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <QuickLog
          latest={latest}
          todayEntry={todayEntry}
          today={today}
          unit={unit}
        />
        <SummaryStrip
          trend={trend}
          latestKg={latest ? Number(latest.value) : null}
          ratePerWeekKg={rate}
          windowChangeKg={change}
          windowPreset={windowPreset}
          latestBodyFat={latestBodyFat}
          lastDay={lastDay}
          todayCalories={todayCalories}
          nutrition={nutrition}
          maintenance={maintenance}
          unit={unit}
        />
      </div>

      {weights.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">Your chart starts with one weigh-in</p>
          <p className="mx-auto mt-1 max-w-md text-muted-foreground text-sm">
            Log today&apos;s weight above. After a week of weigh-ins you get a
            trend line and weekly rate. Have history elsewhere?{" "}
            <Link
              href="/settings#data"
              className="text-foreground underline underline-offset-4"
            >
              Import it in Settings
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:h-[600px] lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Chart
            weights={weights}
            trend={trend}
            unit={unit}
            windowPreset={windowPreset}
            onWindowPresetChange={setWindowPreset}
          />
          <WeightList weights={weights} unit={unit} timeZone={timeZone} />
        </div>
      )}
    </div>
  );
}

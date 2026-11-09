"use client";

import { addDays as addDaysToDate, format } from "date-fns";
import { Info } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CalcSnapshot } from "@/db/schema";
import { formatCoverage } from "@/lib/adaptive-tdee";
import { type WindowPreset, windowLabel } from "@/lib/chart-window";
import { parseDay } from "@/lib/dates";
import type { MaintenanceSource } from "@/lib/nutrition";
import { type DayPoint, projectToTarget } from "@/lib/trend";
import { kgToUnit, roundForUnit, type WeightUnit } from "@/lib/units";
import { cn } from "@/lib/utils";

export type Goal = "cut" | "bulk" | "maintain";

/** Profile-derived inputs; null when the user has no profile yet. */
export type NutritionSummary = {
  goal: Goal;
  targetBodyFat: number | null;
  snapshot: CalcSnapshot;
} | null;

/**
 * Maintenance calories driving the targets (see `chooseMaintenance`):
 * `adaptive` = observed from logged intake vs weight change, `blended` =
 * confidence-weighted mix with the formula, `formula` = BMR × activity.
 */
export type MaintenanceStat = {
  kcal: number | null;
  source: MaintenanceSource;
  confidence: number | null;
  /** Tooltip: how it was computed, or why it fell back to the formula. */
  explanation: string;
};

const MAINTENANCE_SUB: Record<MaintenanceSource, string> = {
  adaptive: "Adaptive, from your intake and weight",
  blended: "Blended: adaptive + formula",
  formula: "Formula estimate from your profile",
};

type Tone = "good" | "bad" | "neutral";

/** Goal-aware direction colour: down is only "good" on a cut. */
function directionTone(deltaKg: number | null, goal: Goal | null): Tone {
  if (deltaKg === null || goal === null || goal === "maintain")
    return "neutral";
  if (Math.abs(deltaKg) < 0.05) return "neutral";
  const towardGoal = goal === "cut" ? deltaKg < 0 : deltaKg > 0;
  return towardGoal ? "good" : "bad";
}

const TONE_CLASS: Record<Tone, string> = {
  good: "text-emerald-700 dark:text-emerald-400",
  bad: "text-amber-700 dark:text-amber-400",
  neutral: "text-muted-foreground",
};

function signed(n: number, decimals = 1): string {
  const r = Number(n.toFixed(decimals));
  if (r === 0) return (0).toFixed(decimals);
  return `${r > 0 ? "+" : "−"}${Math.abs(r).toFixed(decimals)}`;
}

const kcal = (n: number) => Math.round(n).toLocaleString("en-US");

function Stat({
  label,
  value,
  unit,
  sub,
  tone = "neutral",
  className,
  ...rest
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  tone?: Tone;
  className?: string;
} & Record<`data-${string}`, string>) {
  return (
    <div
      className={cn("flex min-w-0 flex-col gap-1 bg-card p-4", className)}
      {...rest}
    >
      <div className="text-muted-foreground text-sm">{label}</div>
      <p className="truncate font-semibold text-2xl tabular-nums tracking-tight">
        {value}
        {unit && (
          <span className="ml-1 font-normal text-muted-foreground text-sm">
            {unit}
          </span>
        )}
      </p>
      {sub && <p className={cn("text-xs", TONE_CLASS[tone])}>{sub}</p>}
    </div>
  );
}

export function SummaryStrip({
  trend,
  latestKg,
  ratePerWeekKg,
  windowChangeKg,
  windowPreset,
  latestBodyFat,
  lastDay,
  todayCalories,
  nutrition,
  maintenance,
  unit,
}: {
  trend: DayPoint[];
  latestKg: number | null;
  ratePerWeekKg: number | null;
  windowChangeKg: number | null;
  windowPreset: WindowPreset;
  latestBodyFat: number | null;
  /** Latest logged day, the projection's starting point. */
  lastDay: string | null;
  todayCalories: number | null;
  nutrition: NutritionSummary;
  maintenance: MaintenanceStat;
  unit: WeightUnit;
}) {
  const goal = nutrition?.goal ?? null;
  const trendKg = trend.length > 0 ? trend[trend.length - 1].kg : null;
  const toUnit = (kg: number) => roundForUnit(kgToUnit(kg, unit), unit);
  const decimals = 1;

  const trendStat = (
    <Stat
      label="Trend weight"
      value={trendKg !== null ? toUnit(trendKg).toFixed(decimals) : "—"}
      unit={trendKg !== null ? unit : undefined}
      sub={
        latestKg !== null
          ? `Last weigh-in ${toUnit(latestKg).toFixed(decimals)} ${unit}`
          : "Log a weigh-in to start your trend"
      }
    />
  );

  const rateStat = (
    <Stat
      label="Weekly rate"
      value={
        ratePerWeekKg !== null ? signed(kgToUnit(ratePerWeekKg, unit), 2) : "—"
      }
      unit={ratePerWeekKg !== null ? `${unit}/wk` : undefined}
      tone={directionTone(ratePerWeekKg, goal)}
      sub={
        ratePerWeekKg !== null && trendKg
          ? `${signed((ratePerWeekKg / trendKg) * 100, 2)}% of body weight, last 4 weeks`
          : "Needs at least a week of weigh-ins"
      }
    />
  );

  const changeStat = (
    <Stat
      label={`Change, ${windowLabel(windowPreset)}`}
      value={
        windowChangeKg !== null
          ? signed(kgToUnit(windowChangeKg, unit), decimals)
          : "—"
      }
      unit={windowChangeKg !== null ? unit : undefined}
      tone={directionTone(windowChangeKg, goal)}
      sub={
        windowChangeKg !== null
          ? "Trend weight, first to latest day"
          : "Not enough weigh-ins in this window"
      }
    />
  );

  if (!nutrition) {
    return (
      <section
        aria-label="Summary"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border"
      >
        {trendStat}
        {rateStat}
        {changeStat}
        <Stat
          label="Body fat"
          value={latestBodyFat !== null ? latestBodyFat.toFixed(1) : "—"}
          unit={latestBodyFat !== null ? "%" : undefined}
          sub={
            latestBodyFat !== null
              ? "Latest reading"
              : "Add it with a weigh-in, optional"
          }
        />
        <div className="col-span-2 flex flex-col gap-3 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <p className="font-medium text-sm">Get calorie and macro targets</p>
            <p className="text-muted-foreground text-sm">
              Add your age, height, activity and goal. Your targets, body fat
              goal and projected date show up here.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/profile">Set up profile</Link>
          </Button>
        </div>
      </section>
    );
  }

  const { snapshot, targetBodyFat } = nutrition;

  const projection = projectToTarget({
    currentKg: trendKg,
    currentBodyFat: latestBodyFat,
    targetBodyFat,
    ratePerWeekKg,
  });
  let bodyFatSub: ReactNode;
  let bodyFatTone: Tone = "neutral";
  if (targetBodyFat === null) {
    bodyFatSub = "No target set";
  } else if (goal === "maintain") {
    bodyFatSub = `Target ${targetBodyFat}%, maintaining`;
  } else if (projection.ok && lastDay) {
    const eta = addDaysToDate(
      parseDay(lastDay),
      Math.round(projection.weeks * 7),
    );
    bodyFatSub = `Target ${targetBodyFat}% (${toUnit(projection.targetKg).toFixed(decimals)} ${unit}) around ${format(eta, "MMM d, yyyy")}`;
    bodyFatTone = "good";
  } else {
    const reason = projection.ok ? "missing-data" : projection.reason;
    const why = {
      "missing-data": "log body fat to project a date",
      "no-rate": "trend too flat to project a date",
      reached: "reached",
      "moving-away": "trend is moving away from it",
    }[reason];
    bodyFatSub = `Target ${targetBodyFat}%, ${why}`;
    bodyFatTone =
      reason === "moving-away"
        ? "bad"
        : reason === "reached"
          ? "good"
          : "neutral";
  }

  const target = snapshot.targetCalories;
  let caloriesStat: ReactNode;
  if (target === null) {
    caloriesStat = (
      <Stat
        label="Calories today"
        value={todayCalories !== null ? kcal(todayCalories) : "—"}
        unit={todayCalories !== null ? "kcal" : undefined}
        sub="Log a weight to get a target"
      />
    );
  } else if (todayCalories === null) {
    caloriesStat = (
      <Stat
        label="Calories today"
        value="—"
        sub={`Target ${kcal(target)} kcal, nothing imported for today`}
      />
    );
  } else {
    const left = target - todayCalories;
    caloriesStat = (
      <Stat
        label="Calories today"
        value={
          <>
            {kcal(todayCalories)}
            <span className="font-normal text-muted-foreground text-sm">
              {" "}
              / {kcal(target)} kcal
            </span>
          </>
        }
        tone={left >= 0 ? "neutral" : "bad"}
        sub={left >= 0 ? `${kcal(left)} kcal left` : `${kcal(-left)} kcal over`}
      />
    );
  }

  return (
    <section
      aria-label="Summary"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3"
    >
      {trendStat}
      {rateStat}
      {changeStat}
      <Stat
        label="Body fat"
        value={latestBodyFat !== null ? latestBodyFat.toFixed(1) : "—"}
        unit={latestBodyFat !== null ? "%" : undefined}
        tone={bodyFatTone}
        sub={bodyFatSub}
      />
      {caloriesStat}
      <Stat
        label={
          <span className="flex items-center gap-1">
            Maintenance
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="How maintenance is calculated"
                  className="cursor-help"
                >
                  <Info className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-72">
                {maintenance.explanation}
              </TooltipContent>
            </Tooltip>
          </span>
        }
        data-slot="maintenance"
        data-source={maintenance.source}
        value={maintenance.kcal !== null ? kcal(maintenance.kcal) : "—"}
        unit={maintenance.kcal !== null ? "kcal" : undefined}
        sub={
          maintenance.kcal === null
            ? "Log a weight to estimate"
            : maintenance.confidence !== null &&
                maintenance.source !== "formula"
              ? `${MAINTENANCE_SUB[maintenance.source]} · ${formatCoverage(maintenance.confidence)}`
              : MAINTENANCE_SUB[maintenance.source]
        }
      />
    </section>
  );
}

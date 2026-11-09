// Adaptive ("observed") TDEE: maintenance calories inferred from what the
// user actually ate and how their weight actually moved, MacroFactor-style:
//
//   observed TDEE = avg daily intake − weight slope (kg/day) × KCAL_PER_KG
//
// Pure and dependency-free (calendar days "YYYY-MM-DD", kg, kcal) so it can be
// sanity-checked in isolation. Choosing between this and the formula TDEE
// (blend by confidence) lives in `chooseMaintenance` in lib/nutrition.ts.

import type { MaintenanceChoice } from "@/lib/nutrition";
import { KCAL_PER_KG } from "@/lib/nutrition";
import { addDays, type DayPoint, dayDiff, weeklyRate } from "@/lib/trend";
import { kgToUnit, type WeightUnit } from "@/lib/units";

export type IntakeDay = { day: string; kcal: number };

/** Nominal rolling window, ending yesterday (today's intake is in progress). */
export const TDEE_WINDOW_DAYS = 28;
/** Shortest effective window (new users) that still yields an estimate. */
export const MIN_WINDOW_DAYS = 14;
/** Logged calorie days below this are treated as incomplete, not real intake. */
export const MIN_LOGGED_DAY_KCAL = 400;
export const MIN_INTAKE_DAYS = 10;
export const MIN_INTAKE_COVERAGE = 0.6;
export const MIN_WEIGH_INS = 5;
export const MIN_WEIGH_IN_SPAN_DAYS = 10;
/** Outside this range the estimate is assumed to reflect bad logging. */
export const PLAUSIBLE_KCAL: [number, number] = [1000, 6000];

// Confidence reaches 1 at a full 28-day window, ≥ 90% of days logged and
// ≥ 14 weigh-ins (every other day).
const FULL_COVERAGE = 0.9;
const FULL_WEIGH_INS = 14;

export type TdeeWindow = { start: string; end: string; days: number };

export type ObservedTdeeReason =
  | "no-weights"
  | "short-history"
  | "few-intake-days"
  | "low-intake-coverage"
  | "few-weigh-ins"
  | "implausible";

type Coverage = {
  window: TdeeWindow | null;
  /** Calorie days counted (≥ MIN_LOGGED_DAY_KCAL) inside the window. */
  intakeDays: number;
  weighIns: number;
};

export type ObservedTdee =
  | (Coverage & {
      ok: true;
      window: TdeeWindow;
      kcal: number;
      /** 0..1, see `estimateObservedTdee`. */
      confidence: number;
      avgIntakeKcal: number;
      ratePerWeekKg: number;
    })
  | (Coverage & {
      ok: false;
      reason: ObservedTdeeReason;
      /** Raw result when rejected as implausible. */
      rawKcal?: number;
    });

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Observed TDEE over the `windowDays` calendar days ending the day before
 * `today`. The window starts later when the user's first weigh-in / calorie
 * day falls inside it. Missing calorie days are excluded from the average
 * (never counted as 0); missing weigh-ins just drop out of the slope fit.
 *
 * The weight change is the least-squares slope of the weigh-ins in the window
 * (the dashboard's weekly rate), not the EWMA trend's endpoint difference: the
 * EWMA lags ~9 days and is seeded at the first weigh-in, so with short history
 * its delta underestimates a steady change by up to ~30%.
 */
export function estimateObservedTdee({
  weights,
  intake,
  today,
  windowDays = TDEE_WINDOW_DAYS,
  kcalPerKg = KCAL_PER_KG,
  historyStart,
}: {
  weights: DayPoint[];
  intake: IntakeDay[];
  today: string;
  windowDays?: number;
  kcalPerKg?: number;
  /**
   * The user's first weigh-in / calorie day, when `weights`/`intake` were
   * loaded for a recent range only. Defaults to the earliest day passed in.
   */
  historyStart?: string | null;
}): ObservedTdee {
  const end = addDays(today, -1);
  const nominalStart = addDays(end, -(windowDays - 1));

  const pastWeights = weights.filter(
    (w) => w.day <= end && Number.isFinite(w.kg),
  );
  // One intake value per day (the DB guarantees it; be defensive anyway).
  const intakeByDay = new Map<string, number>();
  for (const i of intake) {
    if (i.day <= end && Number.isFinite(i.kcal)) intakeByDay.set(i.day, i.kcal);
  }

  const firstDays = [
    ...pastWeights.map((w) => w.day),
    ...intakeByDay.keys(),
    ...(historyStart ? [historyStart] : []),
  ].sort();
  if (pastWeights.length === 0 && intakeByDay.size === 0) {
    return {
      ok: false,
      reason: "no-weights",
      window: null,
      intakeDays: 0,
      weighIns: 0,
    };
  }
  const start = firstDays[0] > nominalStart ? firstDays[0] : nominalStart;
  const days = dayDiff(start, end) + 1;
  const window: TdeeWindow = { start, end, days };

  const inWindow = (day: string) => day >= start && day <= end;
  const windowWeights = pastWeights.filter((w) => inWindow(w.day));
  const windowIntake = [...intakeByDay.entries()]
    .filter(([day, kcal]) => inWindow(day) && kcal >= MIN_LOGGED_DAY_KCAL)
    .map(([, kcal]) => kcal);
  const coverage: Coverage = {
    window,
    intakeDays: windowIntake.length,
    weighIns: windowWeights.length,
  };
  const fail = (reason: ObservedTdeeReason, rawKcal?: number) =>
    ({ ok: false, reason, rawKcal, ...coverage }) as const;

  if (windowWeights.length === 0) return fail("no-weights");
  if (days < MIN_WINDOW_DAYS) return fail("short-history");
  if (windowIntake.length < MIN_INTAKE_DAYS) return fail("few-intake-days");
  const intakeCoverage = windowIntake.length / days;
  if (intakeCoverage < MIN_INTAKE_COVERAGE) return fail("low-intake-coverage");

  const sortedDays = windowWeights.map((w) => w.day).sort();
  const span = dayDiff(sortedDays[0], sortedDays[sortedDays.length - 1]);
  if (windowWeights.length < MIN_WEIGH_INS || span < MIN_WEIGH_IN_SPAN_DAYS) {
    return fail("few-weigh-ins");
  }
  const ratePerWeekKg = weeklyRate(windowWeights, windowDays);
  if (ratePerWeekKg === null) return fail("few-weigh-ins");

  const avgIntakeKcal =
    windowIntake.reduce((s, k) => s + k, 0) / windowIntake.length;
  const kcal = avgIntakeKcal - (ratePerWeekKg / 7) * kcalPerKg;
  if (kcal < PLAUSIBLE_KCAL[0] || kcal > PLAUSIBLE_KCAL[1]) {
    return fail("implausible", Math.round(kcal));
  }

  const confidence =
    clamp01(days / windowDays) *
    clamp01(intakeCoverage / FULL_COVERAGE) *
    clamp01(windowWeights.length / FULL_WEIGH_INS);

  return {
    ok: true,
    ...coverage,
    window,
    kcal: Math.round(kcal),
    confidence: Math.round(confidence * 100) / 100,
    avgIntakeKcal: Math.round(avgIntakeKcal),
    ratePerWeekKg,
  };
}

export type ObservedTdeePoint = {
  /** Last day of the window (the day before the as-of day). */
  endDay: string;
  kcal: number | null;
  confidence: number | null;
};

/** Observed TDEE as of the end of each of the last `weeks` weeks, oldest first. */
export function observedTdeeSeries({
  weights,
  intake,
  today,
  weeks = 8,
  historyStart,
}: {
  weights: DayPoint[];
  intake: IntakeDay[];
  today: string;
  weeks?: number;
  historyStart?: string | null;
}): ObservedTdeePoint[] {
  const out: ObservedTdeePoint[] = [];
  for (let k = weeks - 1; k >= 0; k--) {
    const asOf = addDays(today, -7 * k);
    const est = estimateObservedTdee({
      weights,
      intake,
      today: asOf,
      historyStart,
    });
    out.push({
      endDay: addDays(asOf, -1),
      kcal: est.ok ? est.kcal : null,
      confidence: est.ok ? est.confidence : null,
    });
  }
  return out;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** Why there is no observed estimate, in a sentence. */
export function observedReasonText(observed: ObservedTdee): string | null {
  if (observed.ok) return null;
  const days = observed.window?.days ?? 0;
  switch (observed.reason) {
    case "no-weights":
      return `No weigh-ins in the last ${TDEE_WINDOW_DAYS} days.`;
    case "short-history":
      return `Only ${days} day${days === 1 ? "" : "s"} of data so far; needs ${MIN_WINDOW_DAYS}.`;
    case "few-intake-days":
      return `Calories logged on only ${observed.intakeDays} day${observed.intakeDays === 1 ? "" : "s"}; needs ${MIN_INTAKE_DAYS}.`;
    case "low-intake-coverage":
      return `Calories logged on ${observed.intakeDays} of ${days} days; needs ${Math.round(MIN_INTAKE_COVERAGE * 100)}%.`;
    case "few-weigh-ins":
      return `${observed.weighIns} weigh-in${observed.weighIns === 1 ? "" : "s"} in the window; needs ${MIN_WEIGH_INS} spread over ${MIN_WEIGH_IN_SPAN_DAYS}+ days.`;
    case "implausible":
      return `The estimate (${fmt(observed.rawKcal ?? 0)} kcal) looks implausible, likely from incomplete calorie logs.`;
  }
}

/** How the observed estimate was computed, in a sentence or two. */
export function observedDetailText(
  observed: ObservedTdee,
  unit: WeightUnit,
): string | null {
  if (!observed.ok) return null;
  const rate = kgToUnit(observed.ratePerWeekKg, unit);
  const signedRate = `${rate >= 0 ? "+" : "−"}${Math.abs(rate).toFixed(2)}`;
  // Energy burned beyond intake (positive when losing weight).
  const stored = observed.kcal - observed.avgIntakeKcal;
  const storedText = `${stored >= 0 ? "+" : "−"} ${fmt(Math.abs(stored))}`;
  return (
    `Last ${observed.window.days} days: average intake ${fmt(observed.avgIntakeKcal)} kcal ` +
    `(${observed.intakeDays} days logged) and weight trend ${signedRate} ${unit}/wk ` +
    `(${observed.weighIns} weigh-ins). ${fmt(observed.avgIntakeKcal)} ${storedText} kcal/day ` +
    `for the weight change (at ${fmt(KCAL_PER_KG)} kcal/kg) ≈ ${fmt(observed.kcal)} kcal.`
  );
}

/** Tooltip text for the maintenance in use: what drives it and why. */
export function explainMaintenance(
  choice: MaintenanceChoice,
  observed: ObservedTdee | null,
  unit: WeightUnit,
): string {
  const formula =
    choice.formulaKcal !== null
      ? `Formula (BMR × activity): ${fmt(choice.formulaKcal)} kcal.`
      : "";
  if (!observed) return formula || "Log weights and calories to estimate.";
  const detail = observedDetailText(observed, unit);
  const confidence =
    choice.confidence !== null
      ? `${Math.round(choice.confidence * 100)}% confidence`
      : "";
  switch (choice.source) {
    case "adaptive":
      return [detail, confidence && `Adaptive, ${confidence}.`]
        .filter(Boolean)
        .join(" ");
    case "blended":
      return [
        detail,
        formula,
        `Not enough data for full confidence (${confidence}), so the two are blended by confidence.`,
      ]
        .filter(Boolean)
        .join(" ");
    case "formula":
      return [
        formula,
        `Adaptive estimate unavailable: ${observedReasonText(observed) ?? "not enough data."}`,
      ]
        .filter(Boolean)
        .join(" ");
  }
}

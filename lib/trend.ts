// Pure trend/summary math for weight series. Inputs are calendar days
// ("YYYY-MM-DD") and kg; no Date-in-local-timezone arithmetic, so results do
// not depend on the browser/server timezone. Kept dependency-free so it can be
// unit tested in isolation.

import { calcTargetWeightKg } from "@/lib/nutrition";

export type DayPoint = { day: string; kg: number };

/** Smoothing per day (Hacker's Diet style): one outlier moves the trend 10%. */
export const TREND_ALPHA = 0.1;
/** Look-back for the least-squares weekly rate. */
export const RATE_WINDOW_DAYS = 28;
const MIN_RATE_SPAN_DAYS = 7;

function dayNumber(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function dayDiff(a: string, b: string): number {
  return Math.round(dayNumber(b) - dayNumber(a));
}

/** `day` shifted by `days` (may be negative). */
export function addDays(day: string, days: number): string {
  const d = new Date((dayNumber(day) + days) * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function sortByDay(points: DayPoint[]): DayPoint[] {
  return [...points].sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * Time-aware exponentially weighted moving average. Seeded with the first
 * weight; across a gap of `g` days the new point's weight is `1 − (1−α)^g`, so
 * sparse logging isn't over-smoothed. Returns one trend point per input day.
 */
export function ewmaTrend(
  points: DayPoint[],
  alpha: number = TREND_ALPHA,
): DayPoint[] {
  const sorted = sortByDay(points);
  const out: DayPoint[] = [];
  let prev: DayPoint | null = null;
  for (const p of sorted) {
    if (!prev) {
      prev = { day: p.day, kg: p.kg };
    } else {
      const gap = Math.max(1, dayDiff(prev.day, p.day));
      const k = 1 - (1 - alpha) ** gap;
      prev = { day: p.day, kg: prev.kg + k * (p.kg - prev.kg) };
    }
    out.push(prev);
  }
  return out;
}

/**
 * Least-squares slope (kg/week) of weight vs day over the last `windowDays`
 * ending at the latest point. Null with < 2 points or < 7 days of span.
 */
export function weeklyRate(
  points: DayPoint[],
  windowDays: number = RATE_WINDOW_DAYS,
): number | null {
  if (points.length < 2) return null;
  const sorted = sortByDay(points);
  const last = sorted[sorted.length - 1].day;
  const recent = sorted.filter((p) => dayDiff(p.day, last) < windowDays);
  if (recent.length < 2) return null;
  const xs = recent.map((p) => dayDiff(recent[0].day, p.day));
  if (xs[xs.length - 1] < MIN_RATE_SPAN_DAYS) return null;
  const n = recent.length;
  const meanX = xs.reduce((s, x) => s + x, 0) / n;
  const meanY = recent.reduce((s, p) => s + p.kg, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (recent[i].kg - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den === 0 ? null : (num / den) * 7;
}

/**
 * Change in trend weight between the first point on/after `fromDay` and the
 * latest point. `fromDay = null` uses the whole series. Null with < 2 points.
 */
export function windowChange(
  trend: DayPoint[],
  fromDay: string | null,
): number | null {
  const sorted = sortByDay(trend);
  const inWindow =
    fromDay === null ? sorted : sorted.filter((p) => p.day >= fromDay);
  if (inWindow.length < 2) return null;
  return inWindow[inWindow.length - 1].kg - inWindow[0].kg;
}

export type Projection =
  | { ok: true; targetKg: number; weeks: number }
  | {
      ok: false;
      reason: "missing-data" | "no-rate" | "reached" | "moving-away";
      targetKg: number | null;
    };

/** Below this |rate| (kg/week) the weight is treated as flat. */
const FLAT_RATE_KG = 0.05;
/** Within this distance (kg) the target counts as reached. */
const REACHED_KG = 0.2;

/**
 * Weeks until the trend weight reaches the weight implied by the target body
 * fat (lean mass held constant) at the current weekly rate.
 */
export function projectToTarget({
  currentKg,
  currentBodyFat,
  targetBodyFat,
  ratePerWeekKg,
}: {
  currentKg: number | null;
  currentBodyFat: number | null;
  targetBodyFat: number | null;
  ratePerWeekKg: number | null;
}): Projection {
  if (currentKg === null || currentBodyFat === null || targetBodyFat === null) {
    return { ok: false, reason: "missing-data", targetKg: null };
  }
  const targetKg = calcTargetWeightKg({
    weightKg: currentKg,
    currentBodyFat,
    targetBodyFat,
  });
  const remaining = targetKg - currentKg;
  if (Math.abs(remaining) <= REACHED_KG) {
    return { ok: false, reason: "reached", targetKg };
  }
  if (ratePerWeekKg === null || Math.abs(ratePerWeekKg) < FLAT_RATE_KG) {
    return { ok: false, reason: "no-rate", targetKg };
  }
  if (Math.sign(remaining) !== Math.sign(ratePerWeekKg)) {
    return { ok: false, reason: "moving-away", targetKg };
  }
  return { ok: true, targetKg, weeks: remaining / ratePerWeekKg };
}

function niceStep(rough: number): number {
  const exp = Math.floor(Math.log10(rough));
  const base = 10 ** exp;
  const f = rough / base;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * base;
}

/**
 * Domain rounded outward to a "nice" step (1/2/2.5/5 × 10ⁿ) with the ticks at
 * that step, aiming for at most `maxTicks` ticks.
 */
export function niceDomain(
  min: number,
  max: number,
  maxTicks = 6,
): { domain: [number, number]; ticks: number[] } {
  let lo = min;
  let hi = max;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    return { domain: [0, 1], ticks: [0, 1] };
  }
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const step = niceStep((hi - lo) / Math.max(1, maxTicks - 1));
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  // Round to the step's precision to avoid float noise like 78.30000000000001.
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  for (let v = start; v <= end + step / 2; v += step) {
    ticks.push(Number(v.toFixed(decimals)));
  }
  return {
    domain: [ticks[0], ticks[ticks.length - 1]],
    ticks,
  };
}

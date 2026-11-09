import "server-only";

import { and, eq, gte, min } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { calorieLog, weight } from "@/db/schema";
import {
  estimateObservedTdee,
  type IntakeDay,
  type ObservedTdee,
  type ObservedTdeePoint,
  observedTdeeSeries,
  TDEE_WINDOW_DAYS,
} from "@/lib/adaptive-tdee";
import { todayInTimeZone } from "@/lib/dates";
import { addDays, type DayPoint } from "@/lib/trend";

export const SERIES_WEEKS = 8;

/** Weight rows (kg) -> pure-math input. */
export function toDayPoints(rows: { date: string; value: string }[]) {
  return rows.map((r): DayPoint => ({ day: r.date, kg: Number(r.value) }));
}

/** Calorie rows -> pure-math input; rows without calories are dropped. */
export function toIntakeDays(
  rows: { date: string; actualCalories: string | null }[],
) {
  return rows
    .filter((r) => r.actualCalories !== null)
    .map((r): IntakeDay => ({ day: r.date, kcal: Number(r.actualCalories) }));
}

/**
 * Observed TDEE as of today in `timeZone`, plus (optionally) its weekly
 * series. Only loads the days the windows can reach.
 */
export async function getObservedTdee(
  userId: string,
  timeZone: string,
  { withSeries = false }: { withSeries?: boolean } = {},
): Promise<{ observed: ObservedTdee; series: ObservedTdeePoint[] | null }> {
  const today = todayInTimeZone(timeZone);
  const since = addDays(
    today,
    -(TDEE_WINDOW_DAYS + 1 + (withSeries ? 7 * (SERIES_WEEKS - 1) : 0)),
  );
  const [weightRows, calorieRows, [firstWeight], [firstCalorie]] =
    await Promise.all([
      db
        .select({ date: weight.date, value: weight.value })
        .from(weight)
        .where(and(eq(weight.userId, userId), gte(weight.date, since))),
      db
        .select({
          date: calorieLog.date,
          actualCalories: calorieLog.actualCalories,
        })
        .from(calorieLog)
        .where(and(eq(calorieLog.userId, userId), gte(calorieLog.date, since))),
      db
        .select({ day: min(weight.date) })
        .from(weight)
        .where(eq(weight.userId, userId)),
      db
        .select({ day: min(calorieLog.date) })
        .from(calorieLog)
        .where(eq(calorieLog.userId, userId)),
    ]);
  // First day ever, so a range-limited load doesn't shorten the window.
  const historyStart =
    [firstWeight?.day, firstCalorie?.day]
      .filter((d): d is string => !!d)
      .sort()[0] ?? null;
  const weights = toDayPoints(weightRows);
  const intake = toIntakeDays(calorieRows);
  return {
    observed: estimateObservedTdee({ weights, intake, today, historyStart }),
    series: withSeries
      ? observedTdeeSeries({
          weights,
          intake,
          today,
          weeks: SERIES_WEEKS,
          historyStart,
        })
      : null,
  };
}

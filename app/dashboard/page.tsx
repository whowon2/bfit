import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard-view";
import { estimateObservedTdee, explainMaintenance } from "@/lib/adaptive-tdee";
import { auth } from "@/lib/auth";
import { todayInTimeZone } from "@/lib/dates";
import { chooseMaintenance, computeCalcSnapshot } from "@/lib/nutrition";
import { toDayPoints, toIntakeDays } from "@/lib/queries/adaptive-tdee";
import { getCalorieEntries } from "@/lib/queries/calorie";
import { getProfile } from "@/lib/queries/profile";
import { getUserTimeZone } from "@/lib/queries/user";
import { getWeightEntries } from "@/lib/queries/weight";
import { toWeightUnit } from "@/lib/units";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/signin");
  }

  const userId = session.user.id;
  const unit = toWeightUnit(session.user.weightUnit);

  const [timeZone, weights, calories, profile] = await Promise.all([
    getUserTimeZone(userId),
    getWeightEntries(userId),
    getCalorieEntries(userId),
    getProfile(userId),
  ]);

  // "Today" is decided here, in the user's timezone, so the client renders
  // the same day the server would upsert into.
  const today = todayInTimeZone(timeZone);

  // `weights` is newest-first; the latest body fat may be on an older row.
  const latestWeightKg = weights[0] ? Number(weights[0].value) : null;
  const latestBodyFatRow = weights.find((w) => w.bodyFatPercent !== null);
  const latestBodyFat = latestBodyFatRow
    ? Number(latestBodyFatRow.bodyFatPercent)
    : null;

  // Observed (adaptive) TDEE from the full history already loaded above.
  const observed = estimateObservedTdee({
    weights: toDayPoints(weights),
    intake: toIntakeDays(calories),
    today,
  });

  // The profile is optional: without one the dashboard still works and the
  // nutrition stats are replaced by a prompt to set it up.
  const nutrition = profile
    ? {
        goal: profile.goal ?? "maintain",
        targetBodyFat:
          profile.targetBodyFat !== null ? Number(profile.targetBodyFat) : null,
        snapshot: computeCalcSnapshot({
          profile,
          weightKg: latestWeightKg,
          currentBodyFat: latestBodyFat,
          observed,
        }),
      }
    : null;

  // Same policy the snapshot used for its target calories.
  const maintenanceChoice = chooseMaintenance(
    observed,
    nutrition?.snapshot.tdee ?? null,
  );

  const todayCalories = calories.find((c) => c.date === today)?.actualCalories;

  return (
    <DashboardView
      weights={weights}
      calories={calories}
      unit={unit}
      timeZone={timeZone}
      today={today}
      latestBodyFat={latestBodyFat}
      todayCalories={todayCalories != null ? Number(todayCalories) : null}
      nutrition={nutrition}
      maintenance={{
        kcal: maintenanceChoice.kcal,
        source: maintenanceChoice.source,
        confidence: maintenanceChoice.confidence,
        explanation: explainMaintenance(maintenanceChoice, observed, unit),
      }}
    />
  );
}

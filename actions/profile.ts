"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/drizzle";
import type { ChangedFields } from "@/db/schema";
import { profileHistory, userProfile } from "@/db/schema";
import { dayInTimeZone } from "@/lib/dates";
import { computeCalcSnapshot, goalConflict } from "@/lib/nutrition";
import {
  type ProfileFormValues,
  profileFormSchema,
} from "@/lib/profile-schema";
import { getObservedTdee } from "@/lib/queries/adaptive-tdee";
import { getProfile } from "@/lib/queries/profile";
import { getLatestBodyFat, getLatestWeight } from "@/lib/queries/weight";
import { requireUser } from "@/lib/session";

function toDbValues(data: ProfileFormValues, timeZone: string) {
  return {
    // The picker yields local midnight of the chosen day; take that day in the
    // user's timezone rather than UTC (which shifts it east of Greenwich).
    birthDate: dayInTimeZone(data.birthDate, timeZone),
    sex: data.sex,
    activityLevel: data.activityLevel,
    goal: data.goal,
    targetWeeks: data.targetWeeks,
    carbRatioPercent: data.carbRatioPercent,
    height: data.height.toString(),
    targetBodyFat: data.targetBodyFat.toString(),
    proteinPerKg: data.proteinPerKg.toString(),
  };
}

function assertGoalConsistent(
  data: ProfileFormValues,
  currentBodyFat: number | null,
) {
  const conflict = goalConflict({
    goal: data.goal,
    currentBodyFat,
    targetBodyFat: data.targetBodyFat,
  });
  if (conflict) throw new Error(conflict);
}

/**
 * Inputs for the calc snapshot, including the observed (adaptive) TDEE so the
 * recorded targets are the ones the user actually saw.
 */
async function latestMeasurements(userId: string, timeZone: string) {
  const [latestWeight, latestBodyFat, { observed }] = await Promise.all([
    getLatestWeight(userId),
    getLatestBodyFat(userId),
    getObservedTdee(userId, timeZone),
  ]);
  const weightKg = latestWeight?.value;
  const currentBodyFat = latestBodyFat?.bodyFatPercent;
  return {
    weightKg: weightKg != null ? Number(weightKg) : null,
    currentBodyFat: currentBodyFat != null ? Number(currentBodyFat) : null,
    observed,
  };
}

export async function createProfile(input: ProfileFormValues) {
  const { userId, timeZone } = await requireUser();
  const data = profileFormSchema.parse(input);
  const measurements = await latestMeasurements(userId, timeZone);
  assertGoalConsistent(data, measurements.currentBodyFat);
  const values = toDbValues(data, timeZone);

  const [profile] = await db
    .insert(userProfile)
    .values({
      userId,
      ...values,
    })
    .returning();

  const calcAfter = computeCalcSnapshot({ profile, ...measurements });

  const changedFields: ChangedFields = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      { old: null, new: value },
    ]),
  );

  await db.insert(profileHistory).values({
    userId,
    changedFields,
    calcBefore: null,
    calcAfter,
  });

  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export async function updateProfile(input: ProfileFormValues) {
  const { userId, timeZone } = await requireUser();
  const data = profileFormSchema.parse(input);

  const before = await getProfile(userId);
  const measurements = await latestMeasurements(userId, timeZone);
  assertGoalConsistent(data, measurements.currentBodyFat);
  const values = toDbValues(data, timeZone);

  const calcBefore = before
    ? computeCalcSnapshot({ profile: before, ...measurements })
    : null;

  const [after] = await db
    .update(userProfile)
    .set(values)
    .where(eq(userProfile.userId, userId))
    .returning();

  if (!after) {
    throw new Error("Profile not found");
  }

  const calcAfter = computeCalcSnapshot({ profile: after, ...measurements });

  const NUMERIC_FIELDS = new Set(["height", "targetBodyFat", "proteinPerKg"]);

  const beforeDb = before as Record<string, unknown> | undefined;
  const afterDb = values as Record<string, unknown>;
  const changedFields: ChangedFields = Object.fromEntries(
    Object.entries(afterDb)
      .filter(([key, value]) => {
        const oldValue = beforeDb?.[key];
        if (NUMERIC_FIELDS.has(key)) {
          return Number(oldValue) !== Number(value);
        }
        return oldValue !== value;
      })
      .map(([key, value]) => [
        key,
        { old: beforeDb?.[key] ?? null, new: value },
      ]),
  );

  if (Object.keys(changedFields).length > 0) {
    await db.insert(profileHistory).values({
      userId,
      changedFields,
      calcBefore,
      calcAfter,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

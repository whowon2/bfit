"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/drizzle";
import type { ChangedFields } from "@/db/schema";
import { profileHistory, userProfile } from "@/db/schema";
import { computeCalcSnapshot } from "@/lib/nutrition";
import {
  type ProfileFormValues,
  profileFormSchema,
} from "@/lib/profile-schema";
import { getProfile } from "@/lib/queries/profile";
import { getLatestBodyFat, getLatestWeight } from "@/lib/queries/weight";
import { requireUserId } from "@/lib/session";

function toDbValues(data: ProfileFormValues) {
  return {
    birthDate: data.birthDate.toISOString().slice(0, 10),
    sex: data.sex,
    activityLevel: data.activityLevel,
    goal: data.goal,
    targetWeeks: data.targetWeeks,
    carbRatioPercent: data.carbRatioPercent,
    height: data.height.toString(),
    targetBodyFat: data.targetBodyFat.toString(),
    proteinPerKg: data.proteinPerKg.toString(),
    maintenanceCalories: data.maintenanceCalories.toString(),
    currentCalories: data.currentCalories.toString(),
  };
}

async function latestMeasurements(userId: string) {
  const weightKg = (await getLatestWeight(userId))?.value;
  const currentBodyFat = (await getLatestBodyFat(userId))?.bodyFatPercent;
  return {
    weightKg: weightKg != null ? Number(weightKg) : null,
    currentBodyFat: currentBodyFat != null ? Number(currentBodyFat) : null,
  };
}

export async function createProfile(input: ProfileFormValues) {
  const userId = await requireUserId();
  const data = profileFormSchema.parse(input);

  const [profile] = await db
    .insert(userProfile)
    .values({
      userId,
      ...toDbValues(data),
    })
    .returning();

  const calcAfter = computeCalcSnapshot({
    profile,
    ...(await latestMeasurements(userId)),
  });

  const changedFields: ChangedFields = Object.fromEntries(
    Object.entries(toDbValues(data)).map(([key, value]) => [
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
  const userId = await requireUserId();
  const data = profileFormSchema.parse(input);

  const before = await getProfile(userId);
  const measurements = await latestMeasurements(userId);

  const calcBefore = before
    ? computeCalcSnapshot({ profile: before, ...measurements })
    : null;

  const [after] = await db
    .update(userProfile)
    .set(toDbValues(data))
    .where(eq(userProfile.userId, userId))
    .returning();

  if (!after) {
    throw new Error("Profile not found");
  }

  const calcAfter = computeCalcSnapshot({ profile: after, ...measurements });

  const NUMERIC_FIELDS = new Set([
    "height",
    "targetBodyFat",
    "proteinPerKg",
    "maintenanceCalories",
    "currentCalories",
  ]);

  const beforeDb = before as Record<string, unknown> | undefined;
  const afterDb = toDbValues(data) as Record<string, unknown>;
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

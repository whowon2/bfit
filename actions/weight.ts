"use server";

import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/db/drizzle";
import type { ChangedFields } from "@/db/schema";
import { profileHistory, userProfile, weight } from "@/db/schema";
import { computeCalcSnapshot } from "@/lib/nutrition";
import type { ProfileFormValues } from "@/lib/profile-schema";

export async function getProfile(userId: string) {
  const profile = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, userId));

  return profile[0];
}

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

export async function createProfile(userId: string, data: ProfileFormValues) {
  const [profile] = await db
    .insert(userProfile)
    .values({
      userId,
      ...toDbValues(data),
    })
    .returning();

  const weightKg = (await getLatestWeight(userId))?.value;
  const currentBodyFat = (await getLatestBodyFat(userId))?.bodyFatPercent;

  const calcAfter = computeCalcSnapshot({
    profile,
    weightKg: weightKg != null ? Number(weightKg) : null,
    currentBodyFat: currentBodyFat != null ? Number(currentBodyFat) : null,
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

export async function updateProfile(userId: string, data: ProfileFormValues) {
  const before = await getProfile(userId);

  const weightKg = (await getLatestWeight(userId))?.value;
  const currentBodyFat = (await getLatestBodyFat(userId))?.bodyFatPercent;
  const weightKgNum = weightKg != null ? Number(weightKg) : null;
  const currentBodyFatNum =
    currentBodyFat != null ? Number(currentBodyFat) : null;

  const calcBefore = before
    ? computeCalcSnapshot({
        profile: before,
        weightKg: weightKgNum,
        currentBodyFat: currentBodyFatNum,
      })
    : null;

  const [after] = await db
    .update(userProfile)
    .set(toDbValues(data))
    .where(eq(userProfile.userId, userId))
    .returning();

  const calcAfter = computeCalcSnapshot({
    profile: after,
    weightKg: weightKgNum,
    currentBodyFat: currentBodyFatNum,
  });

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

export async function getProfileHistory(userId: string, limit = 10) {
  return await db
    .select()
    .from(profileHistory)
    .where(eq(profileHistory.userId, userId))
    .orderBy(desc(profileHistory.createdAt))
    .limit(limit);
}

// 🔹 Get all weight entries for a user
export async function getWeightEntries(userId: string) {
  return await db
    .select()
    .from(weight)
    .where(eq(weight.userId, userId))
    .orderBy(desc(weight.date));
}

// 🔹 Add new weight entry
export async function addWeightEntry(
  userId: string,
  value: number,
  date: Date = new Date(),
  bodyFatPercent?: number,
) {
  await db.insert(weight).values({
    userId,
    value: value.toString(),
    bodyFatPercent: bodyFatPercent != null ? bodyFatPercent.toString() : null,
    date,
  });

  revalidateTag("weights", "max");
}

export async function removeWeightEntry(entryId: number) {
  await db.delete(weight).where(and(eq(weight.id, entryId)));

  revalidateTag("weights", "max");
}

export async function importWeightEntries(
  weights: { value: string; data: Date; userId: string }[],
) {
  await db
    .insert(weight)
    .values(weights)
    .onConflictDoNothing({ target: [weight.userId, weight.date] });
  revalidateTag("weights", "max");
}

// 🔹 Update an existing entry
export async function updateWeightEntry(
  entryId: number,
  userId: string,
  newValue: number,
  newDate?: Date,
  newBodyFatPercent?: number | null,
) {
  await db
    .update(weight)
    .set({
      value: newValue.toString(),
      ...(newDate ? { date: newDate } : {}),
      ...(newBodyFatPercent !== undefined
        ? {
            bodyFatPercent:
              newBodyFatPercent != null ? newBodyFatPercent.toString() : null,
          }
        : {}),
    })
    .where(and(eq(weight.id, entryId), eq(weight.userId, userId)));
}

// 🔹 Delete an entry
export async function deleteWeightEntry(entryId: number, userId: string) {
  await db
    .delete(weight)
    .where(and(eq(weight.id, entryId), eq(weight.userId, userId)));
}

// 🔹 Get weekly averages (last N weeks)
export async function getWeeklyAverages(userId: string, weeks: number = 4) {
  return await db
    .select({
      weekStart: sql<Date>`DATE_TRUNC('week', ${weight.date})`,
      avgWeight: sql<number>`AVG(${weight.value})`,
    })
    .from(weight)
    .where(eq(weight.userId, userId))
    .groupBy(sql`DATE_TRUNC('week', ${weight.date})`)
    .orderBy(desc(sql`week_start`))
    .limit(weeks);
}

// 🔹 Get most recent weight entry
export async function getLatestWeight(userId: string) {
  const rows = await db
    .select()
    .from(weight)
    .where(eq(weight.userId, userId))
    .orderBy(desc(weight.date))
    .limit(1);

  return rows[0];
}

// 🔹 Get most recent weight entry that has a body fat % recorded
export async function getLatestBodyFat(userId: string) {
  const rows = await db
    .select()
    .from(weight)
    .where(and(eq(weight.userId, userId), isNotNull(weight.bodyFatPercent)))
    .orderBy(desc(weight.date))
    .limit(1);

  return rows[0];
}

// 🔹 Get today’s weight (if exists)
export async function getTodayWeight(userId: string) {
  return await db
    .select()
    .from(weight)
    .where(
      and(eq(weight.userId, userId), sql`DATE(${weight.date}) = CURRENT_DATE`),
    )
    .limit(1);
}

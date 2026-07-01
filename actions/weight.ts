"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/db/drizzle";
import { userProfile, weight } from "@/db/schema";

export async function getProfile(userId: string) {
  const profile = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, userId));

  return profile[0];
}

export async function createProfile(userId: string, data: any) {
  return await db.insert(userProfile).values({
    userId: userId,
    ...data,
  });
}

export async function updateProfile(userId: string, data: any) {
  return await db
    .update(userProfile)
    .set(data)
    .where(eq(userProfile.userId, userId));
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
) {
  await db.insert(weight).values({
    userId,
    value: value.toString(),
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
  await db.insert(weight).values(weights);
  revalidateTag("weights", "max");
}

// 🔹 Update an existing entry
export async function updateWeightEntry(
  entryId: number,
  userId: string,
  newValue: number,
  newDate?: Date,
) {
  return await db
    .update(weight)
    .set({
      value: newValue.toString(),
      ...(newDate ? { date: newDate } : {}),
    })
    .where(and(eq(weight.id, entryId), eq(weight.userId, userId)));
}

// 🔹 Delete an entry
export async function deleteWeightEntry(entryId: number, userId: string) {
  return await db
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

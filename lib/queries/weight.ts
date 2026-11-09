import "server-only";

import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { weight } from "@/db/schema";

export async function getWeightEntries(userId: string) {
  return await db
    .select()
    .from(weight)
    .where(eq(weight.userId, userId))
    .orderBy(desc(weight.date), desc(weight.measuredAt));
}

export async function getLatestWeight(userId: string) {
  const rows = await db
    .select()
    .from(weight)
    .where(eq(weight.userId, userId))
    .orderBy(desc(weight.date), desc(weight.measuredAt))
    .limit(1);

  return rows[0];
}

export async function getLatestBodyFat(userId: string) {
  const rows = await db
    .select()
    .from(weight)
    .where(and(eq(weight.userId, userId), isNotNull(weight.bodyFatPercent)))
    .orderBy(desc(weight.date), desc(weight.measuredAt))
    .limit(1);

  return rows[0];
}

import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { calorieLog } from "@/db/schema";

export async function getCalorieEntries(userId: string) {
  return await db
    .select()
    .from(calorieLog)
    .where(eq(calorieLog.userId, userId))
    .orderBy(asc(calorieLog.date));
}

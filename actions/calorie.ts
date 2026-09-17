"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/drizzle";
import { calorieLog } from "@/db/schema";

export async function getCalorieEntries(userId: string) {
  return await db
    .select()
    .from(calorieLog)
    .where(eq(calorieLog.userId, userId));
}

export async function importCalorieEntries(
  entries: {
    userId: string;
    date: Date;
    actualCalories: string;
    proteinG: string;
    carbsG: string;
    fatG: string;
  }[],
) {
  if (entries.length === 0) return;

  await db
    .insert(calorieLog)
    .values(entries)
    .onConflictDoUpdate({
      target: [calorieLog.userId, calorieLog.date],
      set: {
        actualCalories: sql`excluded.actual_calories`,
        proteinG: sql`excluded.protein_g`,
        carbsG: sql`excluded.carbs_g`,
        fatG: sql`excluded.fat_g`,
      },
    });

  revalidatePath("/profile");
}

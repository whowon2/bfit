"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { calorieLog } from "@/db/schema";
import { isDayString } from "@/lib/dates";
import { requireUserId } from "@/lib/session";

const MAX_IMPORT_ROWS = 10_000;

// calories are decimal(6,0); macros are decimal(6,1).
const calories = z.coerce.number().finite().min(0).max(99_999);
const grams = z.coerce.number().finite().min(0).max(9_999);

const importCalorieRow = z.object({
  date: z.string().refine(isDayString, { message: "Invalid date" }),
  actualCalories: calories,
  proteinG: grams,
  carbsG: grams,
  fatG: grams,
});
const importCalorieRows = z.array(importCalorieRow).max(MAX_IMPORT_ROWS);

export type CalorieImportResult = {
  imported: number;
  updated: number;
  skipped: number;
};

/**
 * Upserts one row per day. `skipped` counts duplicate days in the payload
 * (the last one wins); the client adds rows it dropped before sending.
 */
export async function importCalorieEntries(
  entries: unknown,
): Promise<CalorieImportResult> {
  const userId = await requireUserId();
  // zod strips unknown keys, so any client-supplied `userId` is dropped here.
  const parsed = importCalorieRows.parse(entries);
  if (parsed.length === 0) return { imported: 0, updated: 0, skipped: 0 };

  // Postgres can't upsert the same target twice in one statement.
  const byDay = new Map(parsed.map((e) => [e.date, e]));

  const written = await db
    .insert(calorieLog)
    .values(
      [...byDay.values()].map((e) => ({
        userId,
        date: e.date,
        actualCalories: e.actualCalories.toString(),
        proteinG: e.proteinG.toString(),
        carbsG: e.carbsG.toString(),
        fatG: e.fatG.toString(),
      })),
    )
    .onConflictDoUpdate({
      target: [calorieLog.userId, calorieLog.date],
      set: {
        actualCalories: sql`excluded.actual_calories`,
        proteinG: sql`excluded.protein_g`,
        carbsG: sql`excluded.carbs_g`,
        fatG: sql`excluded.fat_g`,
        updatedAt: sql`now()`,
      },
    })
    // xmax is 0 for a freshly inserted tuple and non-zero for an updated one.
    .returning({ inserted: sql<boolean>`(xmax = 0)` });

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  const imported = written.filter((r) => r.inserted).length;
  return {
    imported,
    updated: written.length - imported,
    skipped: parsed.length - byDay.size,
  };
}

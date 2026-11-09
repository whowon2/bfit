"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { calorieLog } from "@/db/schema";
import { requireUserId } from "@/lib/session";

const MAX_IMPORT_ROWS = 10_000;

// calories are decimal(6,0); macros are decimal(6,1).
const calories = z.coerce.number().finite().min(0).max(99_999);
const grams = z.coerce.number().finite().min(0).max(9_999);

const importCalorieRow = z.object({
  date: z.coerce.date(),
  actualCalories: calories,
  proteinG: grams,
  carbsG: grams,
  fatG: grams,
});
const importCalorieRows = z.array(importCalorieRow).max(MAX_IMPORT_ROWS);

export async function importCalorieEntries(entries: unknown) {
  const userId = await requireUserId();
  // zod strips unknown keys, so any client-supplied `userId` is dropped here.
  const parsed = importCalorieRows.parse(entries);
  if (parsed.length === 0) return;

  await db
    .insert(calorieLog)
    .values(
      parsed.map((e) => ({
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
      },
    });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

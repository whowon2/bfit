"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { weight } from "@/db/schema";
import { requireUserId } from "@/lib/session";

// `weight.value` is decimal(5,2) and `body_fat_percent` is decimal(4,1).
const weightValue = z.number().finite().positive().lt(1000);
const bodyFatPercent = z.number().finite().min(0).max(100);
const entryDate = z.date().refine((d) => !Number.isNaN(d.getTime()), {
  message: "Invalid date",
});
const entryId = z.number().int().positive();

const MAX_IMPORT_ROWS = 10_000;

const importWeightRow = z.object({
  value: z.coerce.number().finite().positive().lt(1000),
  date: z.coerce.date(),
  bodyFatPercent: z.coerce.number().finite().min(0).max(100).nullish(),
});
const importWeightRows = z.array(importWeightRow).max(MAX_IMPORT_ROWS);

function revalidateWeightViews() {
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export async function addWeightEntry(
  value: number,
  date: Date = new Date(),
  bodyFat?: number,
) {
  const userId = await requireUserId();
  const v = weightValue.parse(value);
  const d = entryDate.parse(date);
  const bf = bodyFat != null ? bodyFatPercent.parse(bodyFat) : null;

  await db.insert(weight).values({
    userId,
    value: v.toString(),
    bodyFatPercent: bf != null ? bf.toString() : null,
    date: d,
  });

  revalidateWeightViews();
}

export async function removeWeightEntry(id: number) {
  const userId = await requireUserId();
  const parsedId = entryId.parse(id);

  await db
    .delete(weight)
    .where(and(eq(weight.id, parsedId), eq(weight.userId, userId)));

  revalidateWeightViews();
}

export async function importWeightEntries(rows: unknown) {
  const userId = await requireUserId();
  // zod strips unknown keys, so any client-supplied `userId` is dropped here.
  const parsed = importWeightRows.parse(rows);
  if (parsed.length === 0) return;

  await db
    .insert(weight)
    .values(
      parsed.map((r) => ({
        userId,
        value: r.value.toString(),
        date: r.date,
        bodyFatPercent:
          r.bodyFatPercent != null ? r.bodyFatPercent.toString() : null,
      })),
    )
    .onConflictDoNothing({ target: [weight.userId, weight.date] });

  revalidateWeightViews();
}

export async function updateWeightEntry(
  id: number,
  newValue: number,
  newDate?: Date,
  newBodyFatPercent?: number | null,
) {
  const userId = await requireUserId();
  const parsedId = entryId.parse(id);
  const v = weightValue.parse(newValue);
  const d = newDate !== undefined ? entryDate.parse(newDate) : undefined;
  const bf =
    newBodyFatPercent != null
      ? bodyFatPercent.parse(newBodyFatPercent)
      : newBodyFatPercent;

  await db
    .update(weight)
    .set({
      value: v.toString(),
      ...(d ? { date: d } : {}),
      ...(bf !== undefined
        ? { bodyFatPercent: bf != null ? bf.toString() : null }
        : {}),
    })
    .where(and(eq(weight.id, parsedId), eq(weight.userId, userId)));

  revalidateWeightViews();
}

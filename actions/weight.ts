"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { weight } from "@/db/schema";
import {
  dayInTimeZone,
  isDayString,
  isTimeString,
  timeInTimeZone,
  todayInTimeZone,
  zonedTimeToInstant,
} from "@/lib/dates";
import { requireUser } from "@/lib/session";

// `weight.value` is decimal(5,2) and `body_fat_percent` is decimal(4,1).
const weightValue = z.number().finite().positive().lt(1000);
const bodyFatPercent = z.number().finite().min(0).max(100);
const day = z.string().refine(isDayString, { message: "Invalid date" });
const time = z.string().refine(isTimeString, { message: "Invalid time" });
const entryId = z.number().int().positive();

const addInput = z.object({
  value: weightValue,
  bodyFatPercent: bodyFatPercent.nullish(),
  date: day.optional(), // default: today in the user's timezone
  time: time.nullish(), // "HH:mm" wall clock in the user's timezone
});

const updateInput = z.object({
  value: weightValue,
  bodyFatPercent: bodyFatPercent.nullable(),
  date: day,
  time: time.nullable(), // null = time of day unknown
});

const MAX_IMPORT_ROWS = 10_000;

// A row carries its calendar day, its instant, or both. Instant-only rows
// (BFit v1 exports) are assigned to a day in the user's timezone.
const importWeightRow = z
  .object({
    value: z.coerce.number().finite().positive().lt(1000),
    date: day.nullish(),
    measuredAt: z.coerce
      .date()
      .refine((d) => !Number.isNaN(d.getTime()), { message: "Invalid date" })
      .nullish(),
    bodyFatPercent: z.coerce.number().finite().min(0).max(100).nullish(),
  })
  .refine((r) => r.date != null || r.measuredAt != null, {
    message: "Row needs a date",
  });
const importWeightRows = z.array(importWeightRow).max(MAX_IMPORT_ROWS);

export type AddWeightInput = z.input<typeof addInput>;
export type UpdateWeightInput = z.input<typeof updateInput>;
export type ImportWeightRow = z.input<typeof importWeightRow>;

/** Per-day outcome of an import: new days, replaced days, dropped rows. */
export type ImportResult = {
  imported: number;
  updated: number;
  skipped: number;
};

function revalidateWeightViews() {
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/settings");
}

// Upsert semantics shared by add and import: one row per (user, day); a new
// entry replaces the day's value and time, but keeps an earlier body fat
// reading when it brings none.
const upsertSet = {
  value: sql`excluded.value`,
  measuredAt: sql`excluded.measured_at`,
  bodyFatPercent: sql`COALESCE(excluded.body_fat_percent, "weight"."body_fat_percent")`,
  updatedAt: sql`now()`,
};

/**
 * Logs a weight (kg) for a calendar day, replacing that day's entry if one
 * exists. Returns whether an existing entry was replaced.
 */
export async function addWeightEntry(
  input: AddWeightInput,
): Promise<{ replaced: boolean }> {
  const { userId, timeZone } = await requireUser();
  const data = addInput.parse(input);

  const today = todayInTimeZone(timeZone);
  const entryDay = data.date ?? today;
  const measuredAt = data.time
    ? zonedTimeToInstant(entryDay, data.time, timeZone)
    : entryDay === today
      ? new Date()
      : null; // past day without a time: time unknown

  const [row] = await db
    .insert(weight)
    .values({
      userId,
      value: data.value.toString(),
      bodyFatPercent:
        data.bodyFatPercent != null ? data.bodyFatPercent.toString() : null,
      date: entryDay,
      measuredAt,
    })
    .onConflictDoUpdate({
      target: [weight.userId, weight.date],
      set: upsertSet,
    })
    // xmax is 0 for a freshly inserted tuple and non-zero for an updated one.
    .returning({ inserted: sql<boolean>`(xmax = 0)` });

  revalidateWeightViews();
  return { replaced: row ? !row.inserted : false };
}

export async function removeWeightEntry(id: number) {
  const { userId } = await requireUser();
  const parsedId = entryId.parse(id);

  await db
    .delete(weight)
    .where(and(eq(weight.id, parsedId), eq(weight.userId, userId)));

  revalidateWeightViews();
}

/**
 * Upserts imported rows per day. `skipped` counts rows collapsed into another
 * row of the same day; the client adds the rows it dropped before sending.
 */
export async function importWeightEntries(
  rows: unknown,
): Promise<ImportResult> {
  const { userId, timeZone } = await requireUser();
  // zod strips unknown keys, so any client-supplied `userId` is dropped here.
  const parsed = importWeightRows.parse(rows);
  if (parsed.length === 0) return { imported: 0, updated: 0, skipped: 0 };

  // One row per day: Postgres can't upsert the same target twice in one
  // statement, and the latest weigh-in of a day wins (as with adding).
  const byDay = new Map<
    string,
    {
      value: number;
      measuredAt: Date | null;
      bodyFatPercent: number | null;
    }
  >();
  for (const r of parsed) {
    const measuredAt = r.measuredAt ?? null;
    const rowDay = r.date ?? dayInTimeZone(measuredAt as Date, timeZone);
    const existing = byDay.get(rowDay);
    const isLater =
      !existing ||
      (measuredAt?.getTime() ?? Number.NEGATIVE_INFINITY) >=
        (existing.measuredAt?.getTime() ?? Number.NEGATIVE_INFINITY);
    if (isLater) {
      byDay.set(rowDay, {
        value: r.value,
        measuredAt,
        bodyFatPercent: r.bodyFatPercent ?? existing?.bodyFatPercent ?? null,
      });
    } else if (existing.bodyFatPercent == null && r.bodyFatPercent != null) {
      existing.bodyFatPercent = r.bodyFatPercent;
    }
  }

  const written = await db
    .insert(weight)
    .values(
      [...byDay.entries()].map(([rowDay, r]) => ({
        userId,
        value: r.value.toString(),
        date: rowDay,
        measuredAt: r.measuredAt,
        bodyFatPercent:
          r.bodyFatPercent != null ? r.bodyFatPercent.toString() : null,
      })),
    )
    .onConflictDoUpdate({
      target: [weight.userId, weight.date],
      set: upsertSet,
    })
    .returning({ inserted: sql<boolean>`(xmax = 0)` });

  revalidateWeightViews();
  const imported = written.filter((r) => r.inserted).length;
  return {
    imported,
    updated: written.length - imported,
    skipped: parsed.length - byDay.size,
  };
}

/**
 * Edits one entry. Moving it onto a day that already has another entry is
 * rejected (no silent merge/delete of the other row).
 */
export async function updateWeightEntry(
  id: number,
  input: UpdateWeightInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, timeZone } = await requireUser();
  const parsedId = entryId.parse(id);
  const data = updateInput.parse(input);

  const [current] = await db
    .select()
    .from(weight)
    .where(and(eq(weight.id, parsedId), eq(weight.userId, userId)))
    .limit(1);
  if (!current) return { ok: false, error: "Entry not found." };

  if (data.date !== current.date) {
    const [clash] = await db
      .select({ id: weight.id })
      .from(weight)
      .where(
        and(
          eq(weight.userId, userId),
          eq(weight.date, data.date),
          ne(weight.id, parsedId),
        ),
      )
      .limit(1);
    if (clash) {
      return {
        ok: false,
        error: "There is already an entry for that day. Edit that one instead.",
      };
    }
  }

  // Keep the exact stored instant (seconds included) when neither the day
  // nor the displayed time changed.
  const unchangedTime =
    data.date === current.date &&
    data.time != null &&
    current.measuredAt != null &&
    timeInTimeZone(current.measuredAt, timeZone) === data.time;
  const measuredAt = unchangedTime
    ? current.measuredAt
    : data.time
      ? zonedTimeToInstant(data.date, data.time, timeZone)
      : null;

  await db
    .update(weight)
    .set({
      value: data.value.toString(),
      date: data.date,
      measuredAt,
      bodyFatPercent:
        data.bodyFatPercent != null ? data.bodyFatPercent.toString() : null,
    })
    .where(and(eq(weight.id, parsedId), eq(weight.userId, userId)));

  revalidateWeightViews();
  return { ok: true };
}

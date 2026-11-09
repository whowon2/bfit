"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { requireUserId } from "@/lib/session";

const weightUnit = z.enum(["kg", "lbs"]);

export async function updateWeightUnit(unit: "kg" | "lbs") {
  const userId = await requireUserId();
  const parsed = weightUnit.parse(unit);

  await db.update(user).set({ weightUnit: parsed }).where(eq(user.id, userId));
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

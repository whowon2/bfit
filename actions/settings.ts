"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";

export async function updateWeightUnit(userId: string, unit: "kg" | "lbs") {
  await db.update(user).set({ weightUnit: unit }).where(eq(user.id, userId));
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

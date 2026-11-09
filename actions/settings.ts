"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/session";

const weightUnit = z.enum(["kg", "lbs"]);

export async function updateWeightUnit(unit: "kg" | "lbs") {
  const userId = await requireUserId();
  const parsed = weightUnit.parse(unit);

  await db.update(user).set({ weightUnit: parsed }).where(eq(user.id, userId));

  // Re-read the session from the DB so Better Auth rewrites the session
  // cookie cache (forwarded by the nextCookies plugin); otherwise the old
  // unit would be served from the cache for up to its maxAge.
  await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

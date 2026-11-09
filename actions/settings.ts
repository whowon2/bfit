"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { isValidTimeZone } from "@/lib/dates";
import { requireUserId } from "@/lib/session";

const weightUnit = z.enum(["kg", "lbs"]);
const timeZone = z.string().max(64).refine(isValidTimeZone, {
  message: "Invalid timezone",
});

// Re-read the session from the DB so Better Auth rewrites the session cookie
// cache (forwarded by the nextCookies plugin); otherwise the old value would be
// served from the cache for up to its maxAge.
async function refreshSessionCache() {
  await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
}

function revalidateUserViews() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export async function updateWeightUnit(unit: "kg" | "lbs") {
  const userId = await requireUserId();
  const parsed = weightUnit.parse(unit);

  await db.update(user).set({ weightUnit: parsed }).where(eq(user.id, userId));

  await refreshSessionCache();
  revalidateUserViews();
}

/**
 * Saves the user's IANA timezone. With `onlyIfUnset`, it only fills a missing
 * value (used by the automatic browser detection, so it never overrides a
 * timezone the user picked in Settings).
 */
export async function updateTimezone(
  tz: string,
  options: { onlyIfUnset?: boolean } = {},
) {
  const userId = await requireUserId();
  const parsed = timeZone.parse(tz);

  await db
    .update(user)
    .set({ timezone: parsed })
    .where(
      options.onlyIfUnset
        ? and(eq(user.id, userId), isNull(user.timezone))
        : eq(user.id, userId),
    );

  await refreshSessionCache();
  revalidateUserViews();
}

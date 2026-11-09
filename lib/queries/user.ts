import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { resolveTimeZone } from "@/lib/dates";

/**
 * The user's timezone read from the DB (not the session cookie cache, which
 * can lag behind a just-saved value). Falls back to UTC when unset.
 */
export async function getUserTimeZone(userId: string): Promise<string> {
  const rows = await db
    .select({ timezone: user.timezone })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return resolveTimeZone(rows[0]?.timezone);
}

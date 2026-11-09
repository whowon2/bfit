import "server-only";

import { desc, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { profileHistory, userProfile } from "@/db/schema";

export async function getProfile(userId: string) {
  const profile = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, userId));

  return profile[0];
}

export async function getProfileHistory(userId: string, limit = 10) {
  return await db
    .select()
    .from(profileHistory)
    .where(eq(profileHistory.userId, userId))
    .orderBy(desc(profileHistory.createdAt))
    .limit(limit);
}

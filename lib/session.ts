import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserTimeZone } from "@/lib/queries/user";

/**
 * Resolves the signed-in user's id from the request session.
 * Server actions MUST use this instead of accepting a userId from the caller.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

/**
 * Like `requireUserId`, plus the user's timezone (from the DB) for any
 * instant <-> calendar-day conversion.
 */
export async function requireUser(): Promise<{
  userId: string;
  timeZone: string;
}> {
  const userId = await requireUserId();
  return { userId, timeZone: await getUserTimeZone(userId) };
}

import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";

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

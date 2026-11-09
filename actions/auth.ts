"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { isValidTimeZone } from "@/lib/dates";

export async function signin(_prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await auth.api.signInEmail({
      body: { email, password },
    });
  } catch (error) {
    if (error instanceof Error) return { message: error.message };
  }
  redirect("/dashboard");
}

export async function signup(_prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const timezone = formData.get("timezone");

  if (!name || !email || !password) {
    return { message: "All fields are required." };
  }

  try {
    const result = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
    });
    // `timezone` is an `input: false` Better Auth field, so it is written
    // directly for the user that was just created.
    if (isValidTimeZone(timezone)) {
      await db
        .update(user)
        .set({ timezone })
        .where(eq(user.id, result.user.id));
    }
  } catch (error) {
    if (error instanceof Error) return { message: error.message };
  }

  redirect("/dashboard");
}

export const logout = async () => {
  await auth.api.signOut({
    // This endpoint requires session cookies.
    headers: await headers(),
  });

  redirect("/");
};

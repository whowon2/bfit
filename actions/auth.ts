"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

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

  if (!name || !email || !password) {
    return { message: "All fields are required." };
  }

  try {
    await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
    });
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

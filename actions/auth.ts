"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function signin(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  await auth.api.signInEmail({
    body: { email, password },
  });

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!name) {
    await auth.api.signInEmail({
      body: { email, password },
    });

    redirect("/dashboard");
    return;
  }

  await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
  });

  redirect("/dashboard");
}

export const logout = async () => {
  await auth.api.signOut({
    // This endpoint requires session cookies.
    headers: await headers(),
  });

  redirect("/");
};

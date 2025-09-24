import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { SignupForm } from "./form";

export default async function SignupPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <Card className="w-full max-w-sm mx-auto mt-20 p-4">
      <CardHeader>
        <CardTitle className="font-bold text-center">Sign Up</CardTitle>
      </CardHeader>
      <CardContent>
        <SignupForm />

        <p className="text-sm text-center mt-4">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-blue-500 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

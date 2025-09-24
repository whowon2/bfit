import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { SigninForm } from "./form";

export default async function SigninPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <Card className="w-full max-w-sm mx-auto mt-20 p-4">
      <CardHeader>
        <CardTitle className="font-bold text-center">Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <SigninForm />
        <p className="text-sm text-center mt-4">
          Don’t have an account?{" "}
          <Link href="/auth/signup" className="text-blue-500 hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

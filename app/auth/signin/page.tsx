import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signin, signup } from "@/actions/auth";
import { auth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AuthPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-bold">Signin</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Please log in to access the dashboard.</p>

        <form action={signin} className="flex flex-col gap-2">
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Email"
            className=""
          />
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            className=""
          />

          <Button type="submit" className="">
            Log In
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

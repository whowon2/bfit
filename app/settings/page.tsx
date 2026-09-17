import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WeightUnitSelect } from "@/components/weight-unit-select";
import { auth } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/signin");
  }

  const weightUnit = session.user.weightUnit === "lbs" ? "lbs" : "kg";

  return (
    <div className="container flex flex-col gap-6 p-4 w-full max-w-5xl mx-auto">
      <div className="w-full">
        <h1 className="font-bold text-2xl">Settings</h1>
        <p className="text-muted-foreground text-sm">
          App preferences. Edit your profile and goals from the Profile page.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Units and appearance.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <p className="font-medium text-sm">Weight unit</p>
              <p className="text-muted-foreground text-xs">
                Used across weight logging and charts.
              </p>
            </div>
            <WeightUnitSelect
              userId={session.user.id}
              weightUnit={weightUnit}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <p className="font-medium text-sm">Theme</p>
              <p className="text-muted-foreground text-xs">
                Switch between light and dark mode.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

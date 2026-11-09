import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DataSection } from "@/components/data-section";
import { ThemeToggle } from "@/components/theme-toggle";
import { TimezoneSelect } from "@/components/timezone-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WeightUnitSelect } from "@/components/weight-unit-select";
import { auth } from "@/lib/auth";
import { getCalorieEntries } from "@/lib/queries/calorie";
import { getWeightEntries } from "@/lib/queries/weight";
import { toWeightUnit } from "@/lib/units";

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/signin");
  }

  const [weights, calories] = await Promise.all([
    getWeightEntries(session.user.id),
    getCalorieEntries(session.user.id),
  ]);

  const weightUnit = toWeightUnit(session.user.weightUnit);
  const timezone = session.user.timezone ?? null;
  const timezoneOptions = Intl.supportedValuesOf("timeZone");
  if (!timezoneOptions.includes("UTC")) timezoneOptions.unshift("UTC");
  if (timezone && !timezoneOptions.includes(timezone)) {
    timezoneOptions.unshift(timezone);
  }

  return (
    <div className="container flex flex-col gap-6 p-4 w-full max-w-5xl mx-auto">
      <div className="w-full">
        <h1 className="font-bold text-2xl">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Preferences and your data. Edit your profile and goals from the
          Profile page.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Units, timezone and appearance.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <p className="font-medium text-sm">Weight unit</p>
              <p className="text-muted-foreground text-xs">
                Used across weight logging and charts.
              </p>
            </div>
            <WeightUnitSelect weightUnit={weightUnit} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <p className="font-medium text-sm">Timezone</p>
              <p className="text-muted-foreground text-xs">
                Decides which day a weigh-in belongs to. Changing it does not
                move existing entries.
              </p>
            </div>
            <TimezoneSelect timezone={timezone} options={timezoneOptions} />
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

      <DataSection weights={weights} calories={calories} />
    </div>
  );
}

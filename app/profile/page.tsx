import { format } from "date-fns";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChangedFields } from "@/db/schema";
import { auth } from "@/lib/auth";
import { isDayString, parseDay } from "@/lib/dates";
import { getProfile, getProfileHistory } from "@/lib/queries/profile";
import { getLatestBodyFat, getLatestWeight } from "@/lib/queries/weight";
import { toWeightUnit } from "@/lib/units";
import { cn } from "@/lib/utils";
import { CreateProfileForm } from "./create-form";
import { UpdateProfileForm } from "./update-form";

const SEX_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentary",
  light: "Lightly active",
  moderate: "Moderately active",
  high: "Highly active",
};

const GOAL_LABELS: Record<string, string> = {
  cut: "Cut",
  bulk: "Bulk",
  maintain: "Maintain",
};

const FIELD_LABELS: Record<string, string> = {
  birthDate: "Date of birth",
  sex: "Sex",
  height: "Height",
  activityLevel: "Activity level",
  goal: "Goal",
  targetBodyFat: "Target body fat",
  targetWeeks: "Timeframe",
  carbRatioPercent: "Carb ratio",
  proteinPerKg: "Protein target",
  // Removed fields, kept so older history entries still render.
  maintenanceCalories: "Maintenance calories",
  currentCalories: "Current calories",
};

const NUMERIC_FIELDS = new Set([
  "height",
  "targetBodyFat",
  "targetWeeks",
  "carbRatioPercent",
  "proteinPerKg",
  "maintenanceCalories",
  "currentCalories",
]);

function isDecrease(field: string, oldValue: unknown, newValue: unknown) {
  if (!NUMERIC_FIELDS.has(field)) return false;
  if (oldValue === null || oldValue === undefined) return false;
  return Number(newValue) < Number(oldValue);
}

function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  switch (field) {
    case "sex":
      return SEX_LABELS[value as string] ?? String(value);
    case "activityLevel":
      return ACTIVITY_LABELS[value as string] ?? String(value);
    case "goal":
      return GOAL_LABELS[value as string] ?? String(value);
    case "birthDate":
      // Stored as a calendar day; format it without timezone shifting.
      return isDayString(value)
        ? format(parseDay(value), "PP")
        : new Date(value as string).toLocaleDateString();
    case "height":
      return `${Number(value)} cm`;
    case "targetBodyFat":
      return `${Number(value)}%`;
    case "targetWeeks":
      return `${value} wks`;
    case "carbRatioPercent":
      return `${value}%`;
    case "proteinPerKg":
      return `${Number(value)} g/kg`;
    default:
      return String(value);
  }
}

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/signin");
  }

  const userId = session.user.id;
  const weightUnit = toWeightUnit(session.user.weightUnit);
  const [profile, latestWeight, latestBodyFat, history] = await Promise.all([
    getProfile(userId),
    getLatestWeight(userId),
    getLatestBodyFat(userId),
    getProfileHistory(userId),
  ]);
  const weightKg = latestWeight ? Number(latestWeight.value) : null;
  const currentBodyFat = latestBodyFat?.bodyFatPercent
    ? Number(latestBodyFat.bodyFatPercent)
    : null;

  if (!profile) {
    // Optional step: the dashboard works without a profile; this unlocks
    // calorie and macro targets, previewed from the latest logged weight.
    return (
      <div className="container flex flex-col gap-6 p-4 w-full max-w-5xl mx-auto">
        <div className="flex max-w-lg flex-col gap-1">
          <h1 className="font-bold text-2xl">Set up your profile</h1>
          <p className="text-muted-foreground text-sm">
            Your age, height, activity and goal turn your logged weight into
            daily calorie and macro targets. You can change any of it later.
          </p>
          {weightKg === null && (
            <p className="text-muted-foreground text-sm">
              No weight logged yet —{" "}
              <Link
                href="/dashboard"
                className="text-foreground underline underline-offset-4"
              >
                log one on the dashboard
              </Link>{" "}
              to see full targets.
            </p>
          )}
        </div>
        <Card className="w-full">
          <CardContent>
            <CreateProfileForm
              weightKg={weightKg}
              weightUnit={weightUnit}
              currentBodyFat={currentBodyFat}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex flex-col gap-6 p-4 w-full max-w-5xl mx-auto">
      <div className="w-full">
        <h1 className="font-bold text-2xl">Profile</h1>
      </div>

      <Card className="w-full">
        <CardContent>
          <UpdateProfileForm
            profile={profile}
            weightKg={weightKg}
            weightUnit={weightUnit}
            currentBodyFat={currentBodyFat}
          />
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Past changes and their impact.</CardDescription>
        </CardHeader>
        <CardContent>
          <details>
            <summary className="cursor-pointer text-sm font-medium">
              {history.length} change{history.length === 1 ? "" : "s"}
            </summary>
            <ul className="mt-3 flex flex-col gap-4">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-1 border-t pt-3 text-sm"
                >
                  <p className="text-muted-foreground text-xs">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {Object.entries(entry.changedFields as ChangedFields).map(
                      ([field, { old, new: newValue }]) => (
                        <li key={field}>
                          <span className="text-muted-foreground">
                            {FIELD_LABELS[field] ?? field}:
                          </span>{" "}
                          <span className="text-muted-foreground line-through">
                            {formatFieldValue(field, old)}
                          </span>{" "}
                          <span
                            className={cn(
                              "font-semibold",
                              isDecrease(field, old, newValue)
                                ? "text-red-600 dark:text-red-400"
                                : "text-blue-600 dark:text-blue-400",
                            )}
                          >
                            → {formatFieldValue(field, newValue)}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                  {entry.calcBefore &&
                  entry.calcBefore.tdee !== entry.calcAfter.tdee ? (
                    <p className="text-xs">
                      <span className="text-muted-foreground">TDEE </span>
                      <span className="text-muted-foreground line-through">
                        {entry.calcBefore.tdee ?? "—"}
                      </span>{" "}
                      <span
                        className={cn(
                          "font-semibold",
                          (entry.calcAfter.tdee ?? 0) <
                            (entry.calcBefore.tdee ?? 0)
                            ? "text-red-600 dark:text-red-400"
                            : "text-blue-600 dark:text-blue-400",
                        )}
                      >
                        → {entry.calcAfter.tdee ?? "—"} kcal/day
                      </span>
                    </p>
                  ) : null}
                  {entry.calcBefore &&
                  entry.calcBefore.targetCalories !==
                    entry.calcAfter.targetCalories ? (
                    <p className="text-xs">
                      <span className="text-muted-foreground">Target </span>
                      <span className="text-muted-foreground line-through">
                        {entry.calcBefore.targetCalories ?? "—"}
                      </span>{" "}
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        → {entry.calcAfter.targetCalories ?? "—"} kcal/day
                      </span>
                    </p>
                  ) : null}
                  {entry.calcBefore &&
                  entry.calcAfter.macros &&
                  (entry.calcBefore.macros?.proteinG !==
                    entry.calcAfter.macros.proteinG ||
                    entry.calcBefore.macros?.carbsG !==
                      entry.calcAfter.macros.carbsG ||
                    entry.calcBefore.macros?.fatG !==
                      entry.calcAfter.macros.fatG) ? (
                    <p className="text-xs">
                      <span className="text-muted-foreground">Macros </span>
                      <span className="text-muted-foreground line-through">
                        {entry.calcBefore.macros
                          ? `${entry.calcBefore.macros.proteinG}p/${entry.calcBefore.macros.carbsG}c/${entry.calcBefore.macros.fatG}f`
                          : "—"}
                      </span>{" "}
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        → {entry.calcAfter.macros.proteinG}p/
                        {entry.calcAfter.macros.carbsG}c/
                        {entry.calcAfter.macros.fatG}f
                      </span>
                    </p>
                  ) : null}
                  {!entry.calcBefore ? (
                    <p className="text-muted-foreground text-xs">
                      Initial TDEE {entry.calcAfter.tdee ?? "—"} kcal/day,
                      target {entry.calcAfter.targetCalories ?? "—"} kcal/day
                      {entry.calcAfter.macros
                        ? `, macros ${entry.calcAfter.macros.proteinG}p/${entry.calcAfter.macros.carbsG}c/${entry.calcAfter.macros.fatG}f`
                        : ""}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getLatestBodyFat,
  getLatestWeight,
  getProfile,
  getProfileHistory,
} from "@/actions/weight";
import { ImportNutritionButton } from "@/components/import-nutrition";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChangedFields } from "@/db/schema";
import { auth } from "@/lib/auth";
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
      return new Date(value as string).toLocaleDateString();
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

  const profile = await getProfile(session.user.id);

  if (!profile) {
    return <CreateProfileForm session={session} />;
  }

  const latestWeight = await getLatestWeight(session.user.id);
  const latestBodyFat = await getLatestBodyFat(session.user.id);

  const weightKg = latestWeight ? Number(latestWeight.value) : null;
  const currentBodyFat = latestBodyFat?.bodyFatPercent
    ? Number(latestBodyFat.bodyFatPercent)
    : null;

  const history = await getProfileHistory(session.user.id);

  return (
    <div className="container flex flex-col gap-6 p-4 w-full max-w-5xl mx-auto">
      <div className="w-full">
        <h1 className="font-bold text-2xl">Profile</h1>
      </div>

      <Card className="w-full">
        <CardContent>
          <UpdateProfileForm
            session={session}
            profile={profile}
            weightKg={weightKg}
            currentBodyFat={currentBodyFat}
          />
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Nutrition data</CardTitle>
          <CardDescription>
            Import your daily calories/macros from a MyFitnessPal export.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportNutritionButton session={session} />
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
                  {!entry.calcBefore ? (
                    <p className="text-muted-foreground text-xs">
                      Initial TDEE {entry.calcAfter.tdee ?? "—"} kcal/day,
                      target {entry.calcAfter.targetCalories ?? "—"} kcal/day
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

import { differenceInYears } from "date-fns";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getLatestBodyFat,
  getLatestWeight,
  getProfile,
} from "@/actions/weight";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import {
  calcBmr,
  calcDailyCalorieChange,
  calcMacros,
  calcTdee,
} from "@/lib/nutrition";
import { CreateProfileForm } from "../profile/create-form";

export default async function NutritionPage() {
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

  const age = differenceInYears(new Date(), new Date(profile.birthDate));
  const latestWeight = await getLatestWeight(session.user.id);
  const latestBodyFat = await getLatestBodyFat(session.user.id);

  const weightKg = latestWeight ? Number(latestWeight.value) : null;
  const currentBodyFat = latestBodyFat?.bodyFatPercent
    ? Number(latestBodyFat.bodyFatPercent)
    : null;
  const targetBodyFat = profile.targetBodyFat
    ? Number(profile.targetBodyFat)
    : null;

  const bmr =
    profile.height && weightKg !== null
      ? calcBmr({
          weightKg,
          heightCm: Number(profile.height),
          age,
          sex: profile.sex,
        })
      : null;

  const dailyCalorieChange =
    weightKg !== null &&
    currentBodyFat !== null &&
    targetBodyFat !== null &&
    profile.targetWeeks
      ? calcDailyCalorieChange({
          weightKg,
          currentBodyFat,
          targetBodyFat,
          targetWeeks: profile.targetWeeks,
        })
      : null;

  const tdee =
    bmr !== null ? calcTdee({ bmr, activityLevel: profile.activityLevel }) : null;

  const targetCalories =
    tdee !== null ? tdee + (dailyCalorieChange ?? 0) : null;

  const macros =
    weightKg !== null && targetCalories !== null
      ? calcMacros({
          weightKg,
          targetCalories,
          proteinPerKg: profile.proteinPerKg
            ? Number(profile.proteinPerKg)
            : 1.8,
          carbRatioPercent: profile.carbRatioPercent ?? 50,
        })
      : null;

  return (
    <div className="container flex flex-col gap-6 p-4 items-center w-full max-w-md mx-auto">
      <div className="w-full">
        <h1 className="font-bold text-2xl">Nutrition</h1>
        <p className="text-muted-foreground text-sm">
          Daily calorie and macro targets based on your goals.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Macros</CardTitle>
          <CardDescription>
            {targetCalories !== null
              ? `${targetCalories} kcal/day target`
              : "Log a weight entry and set a target body fat % in settings to see macros."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {macros ? (
            <dl className="grid grid-cols-3 gap-x-4 gap-y-3">
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground text-xs">Protein</dt>
                <dd className="font-medium text-sm">{macros.proteinG} g</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground text-xs">Carbs</dt>
                <dd className="font-medium text-sm">{macros.carbsG} g</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground text-xs">Fat</dt>
                <dd className="font-medium text-sm">{macros.fatG} g</dd>
              </div>
            </dl>
          ) : (
            <p className="text-muted-foreground text-sm">—</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

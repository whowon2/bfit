import { differenceInYears } from "date-fns";
import { Info } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { auth } from "@/lib/auth";
import { calcBmr, calcDailyCalorieChange, calcTdee } from "@/lib/nutrition";
import { CreateProfileForm } from "./create-form";

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

  const age = differenceInYears(new Date(), new Date(profile.birthDate));

  const latestWeight = await getLatestWeight(session.user.id);
  const latestBodyFat = await getLatestBodyFat(session.user.id);

  let bmr: number | null = null;
  if (profile.height && latestWeight) {
    bmr = calcBmr({
      weightKg: Number(latestWeight.value),
      heightCm: Number(profile.height),
      age,
      sex: profile.sex,
    });
  }

  const tdee =
    bmr !== null
      ? calcTdee({ bmr, activityLevel: profile.activityLevel })
      : null;

  // Uses latest weight for current mass, latest known BF% (may be an older
  // entry than the latest weight log) as the current body fat reading.
  let dailyCalorieChange: number | null = null;
  if (
    profile.targetBodyFat &&
    profile.targetWeeks &&
    latestWeight &&
    latestBodyFat
  ) {
    dailyCalorieChange = calcDailyCalorieChange({
      weightKg: Number(latestWeight.value),
      currentBodyFat: Number(latestBodyFat.bodyFatPercent),
      targetBodyFat: Number(profile.targetBodyFat),
      targetWeeks: profile.targetWeeks,
    });
  }

  const stats = [
    { label: "Age", value: `${age} yrs` },
    {
      label: "Sex",
      value: profile.sex ? SEX_LABELS[profile.sex] : "—",
    },
    {
      label: "Height",
      value: profile.height ? `${Number(profile.height)} cm` : "—",
    },
    {
      label: "Activity level",
      value: profile.activityLevel
        ? ACTIVITY_LABELS[profile.activityLevel]
        : "—",
    },
    {
      label: "Goal",
      value: profile.goal ? GOAL_LABELS[profile.goal] : "—",
    },
    {
      label: "Body fat %",
      value: latestBodyFat?.bodyFatPercent
        ? `${Number(latestBodyFat.bodyFatPercent)}%`
        : "—",
    },
    {
      label: "Target body fat",
      value: profile.targetBodyFat
        ? `${Number(profile.targetBodyFat)}% in ${profile.targetWeeks ?? "—"} wks`
        : "—",
    },
    {
      label: "BMR",
      value: bmr ? `${bmr} kcal/day` : "—",
      info: "Mifflin-St Jeor equation: 10×weight(kg) + 6.25×height(cm) − 5×age + sex offset (+5 male, −161 female). This is basal rate at rest — activity level doesn't change it, it scales BMR into TDEE instead.",
    },
    {
      label: "TDEE",
      value: tdee ? `${tdee} kcal/day` : "—",
      info: "BMR × activity multiplier (sedentary 1.2, light 1.375, moderate 1.55, high 1.725). This is your maintenance calories — the baseline used for cut/bulk targets.",
    },
    {
      label:
        dailyCalorieChange !== null && dailyCalorieChange > 0
          ? "Daily surplus"
          : "Daily deficit",
      value:
        dailyCalorieChange !== null
          ? `${dailyCalorieChange > 0 ? "+" : ""}${dailyCalorieChange} kcal/day`
          : "—",
    },
  ];

  return (
    <div className="container flex flex-col gap-6 p-4 items-center w-full max-w-md mx-auto">
      <div className="w-full">
        <h1 className="font-bold text-2xl">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Your details and goals used to personalize calculations.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Signed in as {session.user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground text-xs flex items-center gap-1">
                  {stat.label}
                  {stat.info ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="size-3 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64">
                        {stat.info}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </dt>
                <dd className="font-medium text-sm">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

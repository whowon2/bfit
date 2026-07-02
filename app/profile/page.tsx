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
    const weightKg = Number(latestWeight.value);
    const heightCm = Number(profile.height);
    const sexOffset =
      profile.sex === "male" ? 5 : profile.sex === "female" ? -161 : -78;
    bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset);
  }

  // Daily calorie deficit/surplus to reach targetBodyFat within targetWeeks,
  // assuming lean mass stays constant (7700 kcal ≈ 1 kg fat).
  // Uses latest weight for current mass, latest known BF% (may be an older
  // entry than the latest weight log) as the current body fat reading.
  let dailyCalorieChange: number | null = null;
  if (
    profile.targetBodyFat &&
    profile.targetWeeks &&
    latestWeight &&
    latestBodyFat
  ) {
    const weightKg = Number(latestWeight.value);
    const currentBodyFat = Number(latestBodyFat.bodyFatPercent);
    const targetBodyFat = Number(profile.targetBodyFat);
    const leanMassKg = weightKg * (1 - currentBodyFat / 100);
    const targetWeightKg = leanMassKg / (1 - targetBodyFat / 100);
    const deltaKg = targetWeightKg - weightKg;
    const totalKcal = deltaKg * 7700;
    dailyCalorieChange = Math.round(totalKcal / (profile.targetWeeks * 7));
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
                <dt className="text-muted-foreground text-xs">{stat.label}</dt>
                <dd className="font-medium text-sm">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
          <CardDescription>
            Update your details to keep calorie and rate targets accurate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpdateProfileForm session={session} profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Chart } from "@/components/progress-chart";
import { WeightList } from "@/components/weight-list";
import { auth } from "@/lib/auth";
import { getCalorieEntries } from "@/lib/queries/calorie";
import { getProfile } from "@/lib/queries/profile";
import { getWeightEntries } from "@/lib/queries/weight";
import { toWeightUnit } from "@/lib/units";
import { CreateProfileForm } from "../profile/create-form";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/signin");
  }

  const unit = toWeightUnit(session.user.weightUnit);

  const weights = await getWeightEntries(session.user.id);
  const calories = await getCalorieEntries(session.user.id);

  const profile = await getProfile(session.user.id);

  if (!profile) {
    return <CreateProfileForm />;
  }

  return (
    <div className="flex flex-col gap-6 p-2 items-center w-full">
      <div className="flex gap-4 flex-col w-full lg:flex-row justify-stretch items-stretch lg:h-[calc(100vh-2rem)]">
        <Chart weights={weights} calories={calories} unit={unit} />

        <WeightList weights={weights} unit={unit} />
      </div>
    </div>
  );
}

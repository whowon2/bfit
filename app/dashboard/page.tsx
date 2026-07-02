import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getProfile, getWeightEntries } from "@/actions/weight";
import WeightForm from "@/components/add-weight";
import { ExportJsonButton } from "@/components/export-json";
import { ImportWeightsButton } from "@/components/import-weights";
import { Chart } from "@/components/progress-chart";
import { WeightList } from "@/components/weight-list";
import { auth } from "@/lib/auth";
import { CreateProfileForm } from "../profile/create-form";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/signin");
  }

  const unit = session.user.weightUnit === "lbs" ? "lbs" : "kg";

  const weights = await getWeightEntries(session.user.id);

  const profile = await getProfile(session.user.id);

  if (!profile) {
    return <CreateProfileForm session={session} />;
  }

  return (
    <div className="container flex flex-col gap-6 p-2 items-center w-full">
      <WeightForm userId={session.user.id} />
      <div className="flex items-center gap-4">
        <ImportWeightsButton session={session} />
        <ExportJsonButton weights={weights} />
      </div>

      <div className="flex gap-4 flex-col w-full lg:flex-row justify-stretch items-stretch lg:h-[700px]">
        <Chart weights={weights} />

        <WeightList weights={weights} unit={unit} userId={session.user.id} />
      </div>
    </div>
  );
}

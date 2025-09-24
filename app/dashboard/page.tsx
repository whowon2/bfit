import { X } from "lucide-react";
import { headers } from "next/headers";
import { getWeightEntries } from "@/actions/weight";
import WeightForm from "@/components/add-weight";
import { ExportJsonButton } from "@/components/export-json";
import { ImportWeightsButton } from "@/components/import-weights";
import { Chart } from "@/components/progress-chart";
import { RemoveWeightButton } from "@/components/remove-weight";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { WeightList } from "@/components/weight-list";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const unit = session?.user?.weightUnit === "lbs" ? "lbs" : "kg";

  const weights = await getWeightEntries(session.user.id);

  return (
    <div className="container flex flex-col gap-6 p-2 items-center w-full">
      <WeightForm userId={session.user.id} />
      <div className="flex gap-4">
        <ImportWeightsButton session={session} />
        <ExportJsonButton weights={weights} />
      </div>

      <div className="flex gap-4 flex-col w-full lg:flex-row justify-stretch items-stretch">
        <Chart
          weights={weights.sort((a, b) => a.date.getTime() - b.date.getTime())}
        />

        <WeightList weights={weights} unit={unit} />
      </div>
    </div>
  );
}

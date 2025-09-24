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

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const unit = session?.user?.weightUnit === "lbs" ? "lbs" : "kg";

  const weights = await getWeightEntries(session.user.id);

  return (
    <div className="container flex flex-col gap-6 p-8 items-center w-full">
      <h1>History</h1>
      <WeightForm userId={session.user.id} />
      <div className="flex gap-4">
        <ImportWeightsButton session={session} />
        <ExportJsonButton weights={weights} />
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Weight History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-col w-full lg:flex-row justify-stretch items-stretch">
            <Chart
              weights={weights.sort(
                (a, b) => a.date.getTime() - b.date.getTime(),
              )}
            />

            <Card className="min-w-md">
              <CardHeader>
                <CardTitle>Weights</CardTitle>
              </CardHeader>
              <CardContent className="w-full max-h-[60vh] overflow-auto">
                {weights
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .map((w) => (
                    <div
                      key={w.id}
                      className="flex gap-4 items-center p-2 justify-between last:border-none border-b"
                    >
                      <div>
                        {w.value} {unit}
                      </div>
                      <div>{w.date.toLocaleString()}</div>
                      <RemoveWeightButton weightId={w.id} />
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

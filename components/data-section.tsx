import type { ReactNode } from "react";
import type { CalorieLog, Weight } from "@/db/schema";
import { ExportJsonButton } from "./export-json";
import { ExportNutritionButton } from "./export-nutrition";
import { ImportNutritionButton } from "./import-nutrition";
import { ImportWeightsButton } from "./import-weights";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

function DataRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <div className="flex shrink-0 gap-2">{children}</div>
    </div>
  );
}

/** Settings → Data: every import and export lives here. */
export function DataSection({
  weights,
  calories,
}: {
  weights: Weight[];
  calories: CalorieLog[];
}) {
  return (
    <Card id="data" className="w-full scroll-mt-20">
      <CardHeader>
        <CardTitle>Data</CardTitle>
        <CardDescription>
          Bring history in from other apps or take a copy out. Importing a day
          you already have replaces it.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <DataRow
          title="Weights"
          description={`${weights.length} weigh-in${weights.length === 1 ? "" : "s"}. Imports BFit or Lyfta JSON; exports BFit JSON in kg.`}
        >
          <ImportWeightsButton />
          <ExportJsonButton weights={weights} />
        </DataRow>
        <DataRow
          title="Nutrition"
          description={`${calories.length} day${calories.length === 1 ? "" : "s"} of calories and macros. Imports a MyFitnessPal Nutrition Summary CSV; exports the same format.`}
        >
          <ImportNutritionButton />
          <ExportNutritionButton entries={calories} />
        </DataRow>
      </CardContent>
    </Card>
  );
}

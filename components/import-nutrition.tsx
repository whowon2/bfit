"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { importCalorieEntries } from "@/actions/calorie";
import { isDayString } from "@/lib/dates";
import { importSummary, pickFile } from "@/lib/import-feedback";
import { isMfpNutritionExport, parseMfpNutritionCsv } from "@/lib/mfp";
import { Button } from "./ui/button";

export function ImportNutritionButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleImport() {
    const file = await pickFile(".csv,text/csv");
    if (!file) return;

    startTransition(async () => {
      const text = await file.text();
      if (!isMfpNutritionExport(text)) {
        toast.error(
          "Unrecognized file. Expected a MyFitnessPal Nutrition Summary CSV (first column Date, then Meal, Calories).",
        );
        return;
      }

      const days = parseMfpNutritionCsv(text);
      const usable = days.filter((d) => isDayString(d.date));
      const dropped = days.length - usable.length;
      if (usable.length === 0) {
        toast.error("No days with a valid date found in that file.");
        return;
      }

      try {
        const result = await importCalorieEntries(usable);
        toast.success(
          importSummary("nutrition", {
            ...result,
            skipped: result.skipped + dropped,
          }),
        );
        router.refresh();
      } catch {
        toast.error(
          "The import was rejected: some days have invalid values. Nothing was saved.",
        );
      }
    });
  }

  return (
    <Button variant="outline" onClick={handleImport} disabled={isPending}>
      <Upload />
      {isPending ? "Importing…" : "Import MFP CSV"}
    </Button>
  );
}

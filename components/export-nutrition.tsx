"use client";

import { Download } from "lucide-react";
import type { CalorieLog } from "@/db/schema";
import { toNutritionCsv } from "@/lib/nutrition-export";
import { Button } from "./ui/button";

export function ExportNutritionButton({ entries }: { entries: CalorieLog[] }) {
  function handleExport() {
    // MFP layout, so the file re-imports through the MFP importer.
    const blob = new Blob([toNutritionCsv(entries)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bfit-nutrition-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={entries.length === 0}
    >
      <Download />
      Export CSV
    </Button>
  );
}

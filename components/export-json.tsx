"use client";

import { Download } from "lucide-react";
import type { Weight } from "@/db/schema";
import {
  BFIT_EXPORT_FORMAT,
  BFIT_EXPORT_VERSION,
  type BfitWeightExport,
} from "@/lib/weight-import";
import { Button } from "./ui/button";

export function ExportJsonButton({ weights }: { weights: Weight[] }) {
  function handleExport() {
    // Values are exported as stored (kg) with the unit declared, so a
    // re-import is unambiguous regardless of the importer's unit setting.
    const exportData: BfitWeightExport = {
      format: BFIT_EXPORT_FORMAT,
      version: BFIT_EXPORT_VERSION,
      unit: "kg",
      weights: weights.map(({ value, date, measuredAt, bodyFatPercent }) => ({
        value,
        date, // calendar day "YYYY-MM-DD"
        measuredAt: measuredAt ? measuredAt.toISOString() : null,
        bodyFatPercent,
      })),
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `bfit-weights-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={weights.length === 0}
    >
      <Download />
      Export JSON
    </Button>
  );
}

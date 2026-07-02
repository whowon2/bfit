"use client";

import { Download } from "lucide-react";
import type { Weight } from "@/db/schema";
import { Button } from "./ui/button";

export function ExportJsonButton({ weights }: { weights: Weight[] }) {
  function handleExport() {
    const cleanData = weights.map(
      ({ id, createdAt, updatedAt, userId, ...rest }) => rest,
    );
    const dataStr = JSON.stringify(cleanData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "weights.json";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" className="flex-1" onClick={handleExport}>
      <Download className="h-4 w-4" />
      Export JSON
    </Button>
  );
}

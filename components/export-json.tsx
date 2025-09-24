"use client";

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

  return <Button onClick={handleExport}>Export JSON</Button>;
}

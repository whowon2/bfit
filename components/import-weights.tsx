"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importWeightEntries } from "@/actions/weight";
import { parseWeightImport } from "@/lib/weight-import";
import { Button } from "./ui/button";

export function ImportWeightsButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleImport() {
    setError(null);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = () => {
      if (!input.files?.length) return;
      const file = input.files[0];

      startTransition(async () => {
        try {
          const text = await file.text();
          const data = JSON.parse(text);

          // Normalized to kg from the file's declared unit.
          const weights = parseWeightImport(data);

          await importWeightEntries(weights);
          router.refresh();
        } catch (err) {
          console.error("Invalid JSON file", err);
          setError("Import failed — invalid JSON file.");
        }
      });
    };

    // ⬇️ trigger file picker
    input.click();
  }

  return (
    <div className="relative flex-1">
      <Button
        variant="outline"
        className="w-full"
        onClick={handleImport}
        disabled={isPending}
      >
        <Upload className="h-4 w-4" />
        {isPending ? "Importing..." : "Import JSON"}
      </Button>
      {error && (
        <span className="absolute top-full left-0 mt-1 whitespace-nowrap text-destructive text-sm">
          {error}
        </span>
      )}
    </div>
  );
}

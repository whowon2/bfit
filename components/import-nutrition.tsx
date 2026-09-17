"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importCalorieEntries } from "@/actions/calorie";
import type { Session } from "@/lib/auth-client";
import { isMfpNutritionExport, parseMfpNutritionCsv } from "@/lib/mfp";
import { Button } from "./ui/button";

export function ImportNutritionButton({ session }: { session: Session }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleImport() {
    setError(null);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";

    input.onchange = () => {
      if (!input.files?.length) return;
      const file = input.files[0];

      startTransition(async () => {
        try {
          const text = await file.text();

          if (!isMfpNutritionExport(text)) {
            setError(
              "Unrecognized file — expected an MFP Nutrition Summary CSV.",
            );
            return;
          }

          const days = parseMfpNutritionCsv(text);
          await importCalorieEntries(
            days.map((d) => ({ ...d, userId: session.user.id })),
          );
          router.refresh();
        } catch (err) {
          console.error("Invalid nutrition CSV file", err);
          setError("Import failed — invalid CSV file.");
        }
      });
    };

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
        {isPending ? "Importing..." : "Import MFP Nutrition CSV"}
      </Button>
      {error && (
        <span className="absolute top-full left-0 mt-1 whitespace-nowrap text-destructive text-sm">
          {error}
        </span>
      )}
    </div>
  );
}

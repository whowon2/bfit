"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importWeightEntries } from "@/actions/weight";
import type { Session } from "@/lib/auth-client";
import { convertLyftaWeights, isLyftaWeightExport } from "@/lib/lyfta";
import { Button } from "./ui/button";

export function ImportWeightsButton({ session }: { session: Session }) {
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

          const weights = isLyftaWeightExport(data)
            ? convertLyftaWeights(data, session.user.id)
            : data.map((d: any) => ({
                value: d.value,
                date: new Date(d.date),
                userId: session.user.id,
              }));

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
    <div className="flex flex-col items-start gap-1">
      <Button variant={"outline"} onClick={handleImport} disabled={isPending}>
        {isPending ? "Importing..." : "Import JSON"}
      </Button>
      {error && <span className="text-destructive text-sm">{error}</span>}
    </div>
  );
}

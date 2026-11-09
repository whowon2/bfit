"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { importWeightEntries } from "@/actions/weight";
import { importSummary, pickFile } from "@/lib/import-feedback";
import { type ImportRow, parseWeightImport } from "@/lib/weight-import";
import { Button } from "./ui/button";

// Mirrors the server's row checks so unusable rows are counted as skipped
// instead of failing the whole file (the server still re-validates).
function isUsable(r: ImportRow): boolean {
  return (
    Number.isFinite(r.value) &&
    r.value > 0 &&
    r.value < 1000 &&
    (r.date !== null || r.measuredAt !== null) &&
    (r.bodyFatPercent === null ||
      (Number.isFinite(r.bodyFatPercent) &&
        r.bodyFatPercent >= 0 &&
        r.bodyFatPercent <= 100))
  );
}

export function ImportWeightsButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleImport() {
    const file = await pickFile("application/json,.json");
    if (!file) return;

    startTransition(async () => {
      let data: unknown;
      try {
        data = JSON.parse(await file.text());
      } catch {
        toast.error(`${file.name} isn't valid JSON.`);
        return;
      }

      let rows: ImportRow[];
      try {
        // Normalized to kg from the file's declared unit.
        rows = parseWeightImport(data);
      } catch {
        toast.error(
          "Unrecognized file. Use a BFit weights export or a Lyfta weight export.",
        );
        return;
      }

      const usable = rows.filter(isUsable);
      const dropped = rows.length - usable.length;
      if (usable.length === 0) {
        toast.error("No weigh-ins with a date and weight found in that file.");
        return;
      }

      try {
        const result = await importWeightEntries(usable);
        toast.success(
          importSummary("weights", {
            ...result,
            skipped: result.skipped + dropped,
          }),
        );
        router.refresh();
      } catch {
        toast.error(
          "The import was rejected: some rows have invalid dates or values. Nothing was saved.",
        );
      }
    });
  }

  return (
    <Button variant="outline" onClick={handleImport} disabled={isPending}>
      <Upload />
      {isPending ? "Importing…" : "Import JSON"}
    </Button>
  );
}

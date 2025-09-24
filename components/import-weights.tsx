"use client";

import { importWeightEntries } from "@/actions/weight";
import type { Session } from "@/lib/auth-client";
import { Button } from "./ui/button";

export function ImportWeightsButton({ session }: { session: Session }) {
  async function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = async () => {
      if (input.files?.length) {
        const file = input.files[0];
        const text = await file.text();

        try {
          const data = JSON.parse(text);
          console.log("Imported JSON:", data);

          const weights = data.map((d: any) => ({
            value: d.value,
            date: new Date(d.date),
            userId: session.user.id,
          }));

          await importWeightEntries(weights);
        } catch (error) {
          console.error("Invalid JSON file", error);

          return;
        }
      }
    };

    // ⬇️ trigger file picker
    input.click();
  }

  return (
    <Button variant={"outline"} onClick={handleImport}>
      Import JSON
    </Button>
  );
}

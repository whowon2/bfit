// Copy for import result toasts, shared by the weight and nutrition imports.

export type ImportCounts = {
  imported: number;
  updated: number;
  skipped: number;
};

const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

export function importSummary(what: string, counts: ImportCounts): string {
  const parts = [`${days(counts.imported)} added`];
  if (counts.updated > 0) parts.push(`${counts.updated} updated`);
  if (counts.skipped > 0) parts.push(`${counts.skipped} skipped`);
  return `Imported ${what}: ${parts.join(", ")}.`;
}

/** Opens the browser file picker and resolves with the chosen file. */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

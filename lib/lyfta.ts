import { toStoredKg, toWeightUnit } from "@/lib/units";

export type LyftaWeightExport = {
  status: boolean;
  name: string;
  unit: "kg" | "lbs";
  data: {
    ids: string[];
    dates: string[];
    measures: string[];
  };
};

export function isLyftaWeightExport(data: unknown): data is LyftaWeightExport {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (typeof d.data !== "object" || d.data === null) return false;
  const inner = d.data as Record<string, unknown>;
  return (
    Array.isArray(inner.ids) &&
    Array.isArray(inner.dates) &&
    Array.isArray(inner.measures)
  );
}

// Lyfta measures are in the export's `unit`; BFit stores kg. A missing or
// unknown unit is treated as kg (previous behavior).
export function convertLyftaWeights(
  lyfta: LyftaWeightExport,
): { value: number; date: Date }[] {
  const unit = toWeightUnit(lyfta.unit);
  return lyfta.data.dates.map((date, i) => ({
    value: toStoredKg(Number(lyfta.data.measures[i]), unit),
    date: new Date(date),
  }));
}

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

export function convertLyftaWeights(
  lyfta: LyftaWeightExport,
  userId: string,
): { value: string; date: Date; userId: string }[] {
  return lyfta.data.dates.map((date, i) => ({
    value: lyfta.data.measures[i],
    date: new Date(date),
    userId,
  }));
}

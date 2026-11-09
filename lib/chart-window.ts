// Chart time-window presets, shared by the progress chart and the dashboard
// summary so both use the same cutoff day.

export const WINDOW_PRESETS = ["1M", "3M", "6M", "1Y", "All"] as const;
export type WindowPreset = (typeof WINDOW_PRESETS)[number];

const WINDOW_MONTHS: Record<Exclude<WindowPreset, "All">, number> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
};

export function isWindowPreset(value: unknown): value is WindowPreset {
  return WINDOW_PRESETS.includes(value as WindowPreset);
}

/**
 * First day ("YYYY-MM-DD") inside the window ending at `lastDay`, or null for
 * "All" / no data. Month arithmetic clamps to the month's last day.
 */
export function windowStartDay(
  lastDay: string | null,
  preset: WindowPreset,
): string | null {
  if (preset === "All" || lastDay === null) return null;
  const [y, m, d] = lastDay.split("-").map(Number);
  const targetMonth = m - 1 - WINDOW_MONTHS[preset];
  const lastOfTarget = new Date(Date.UTC(y, targetMonth + 1, 0)).getUTCDate();
  const start = new Date(Date.UTC(y, targetMonth, Math.min(d, lastOfTarget)));
  return start.toISOString().slice(0, 10);
}

export function windowLabel(preset: WindowPreset): string {
  return preset === "All" ? "all time" : `last ${preset}`;
}

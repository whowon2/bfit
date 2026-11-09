import { isDayString } from "@/lib/dates";
import { convertLyftaWeights, isLyftaWeightExport } from "@/lib/lyfta";
import { toStoredKg, toWeightUnit, type WeightUnit } from "@/lib/units";

export const BFIT_EXPORT_FORMAT = "bfit-weights";
// v1: `date` is the weigh-in instant (ISO). v2: `date` is the calendar day
// ("YYYY-MM-DD") and `measuredAt` the instant, or null when unknown.
export const BFIT_EXPORT_VERSION = 2;

export type ExportedWeight = {
  value: string | number;
  date: string | Date;
  measuredAt?: string | Date | null;
  bodyFatPercent?: string | number | null;
};

/** Shape written by the JSON export. Values are always in `unit` (kg). */
export type BfitWeightExport = {
  format: typeof BFIT_EXPORT_FORMAT;
  version: number;
  unit: WeightUnit;
  weights: ExportedWeight[];
};

/**
 * Normalized import row (kg). At least one of `date` (calendar day) and
 * `measuredAt` is set; instant-only rows get their day from the user's
 * timezone on the server.
 */
export type ImportRow = {
  value: number; // kg
  date: string | null;
  measuredAt: Date | null;
  bodyFatPercent: number | null;
};

function isBfitWeightExport(data: unknown): data is BfitWeightExport {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return d.format === BFIT_EXPORT_FORMAT && Array.isArray(d.weights);
}

function toInstant(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function convertRows(
  rows: ExportedWeight[],
  unit: WeightUnit,
  version: number,
): ImportRow[] {
  return rows.map((r) => {
    const bodyFatPercent =
      r.bodyFatPercent != null ? Number(r.bodyFatPercent) : null;
    const value = toStoredKg(Number(r.value), unit);
    // A bare "YYYY-MM-DD" is a calendar day in any version.
    if (typeof r.date === "string" && isDayString(r.date)) {
      return {
        value,
        date: r.date,
        measuredAt: version >= 2 ? toInstant(r.measuredAt) : null,
        bodyFatPercent,
      };
    }
    return { value, date: null, measuredAt: toInstant(r.date), bodyFatPercent };
  });
}

/**
 * Normalizes any supported weight import file to rows in kg:
 * - Lyfta export: converted from its declared `unit`
 * - BFit export object: converted from its `unit` (v1 or v2)
 * - Legacy BFit export (plain array): treated as kg, v1 dates
 * The server action re-validates every row.
 */
export function parseWeightImport(data: unknown): ImportRow[] {
  if (isLyftaWeightExport(data)) {
    return convertLyftaWeights(data).map((r) => ({
      ...r,
      bodyFatPercent: null,
    }));
  }
  if (isBfitWeightExport(data)) {
    return convertRows(
      data.weights,
      toWeightUnit(data.unit),
      Number(data.version) || 1,
    );
  }
  if (Array.isArray(data)) {
    return convertRows(data as ExportedWeight[], "kg", 1);
  }
  throw new Error("Unrecognized weight import format");
}

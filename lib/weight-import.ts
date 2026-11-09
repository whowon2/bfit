import { convertLyftaWeights, isLyftaWeightExport } from "@/lib/lyfta";
import { toStoredKg, toWeightUnit, type WeightUnit } from "@/lib/units";

export const BFIT_EXPORT_FORMAT = "bfit-weights";
export const BFIT_EXPORT_VERSION = 1;

export type ExportedWeight = {
  value: string | number;
  date: string | Date;
  bodyFatPercent?: string | number | null;
};

/** Shape written by the JSON export. Values are always in `unit` (kg). */
export type BfitWeightExport = {
  format: typeof BFIT_EXPORT_FORMAT;
  version: number;
  unit: WeightUnit;
  weights: ExportedWeight[];
};

export type ImportRow = {
  value: number; // kg
  date: Date;
  bodyFatPercent: number | null;
};

function isBfitWeightExport(data: unknown): data is BfitWeightExport {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return d.format === BFIT_EXPORT_FORMAT && Array.isArray(d.weights);
}

function convertRows(rows: ExportedWeight[], unit: WeightUnit): ImportRow[] {
  return rows.map((r) => ({
    value: toStoredKg(Number(r.value), unit),
    date: new Date(r.date),
    bodyFatPercent: r.bodyFatPercent != null ? Number(r.bodyFatPercent) : null,
  }));
}

/**
 * Normalizes any supported weight import file to rows in kg:
 * - Lyfta export: converted from its declared `unit`
 * - BFit export object: converted from its `unit`
 * - Legacy BFit export (plain array): treated as kg
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
    return convertRows(data.weights, toWeightUnit(data.unit));
  }
  if (Array.isArray(data)) {
    return convertRows(data as ExportedWeight[], "kg");
  }
  throw new Error("Unrecognized weight import format");
}

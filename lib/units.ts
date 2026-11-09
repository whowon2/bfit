// Body weight is always stored in kg. These helpers convert at the edges
// (display and input) to the user's selected unit.

export type WeightUnit = "kg" | "lbs";

export const LB_IN_KG = 0.45359237;

export function toWeightUnit(value: unknown): WeightUnit {
  return value === "lbs" ? "lbs" : "kg";
}

const round = (n: number, decimals: number) => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

/** Display precision per unit: kg up to 2 decimals, lbs 1 decimal. */
export function roundForUnit(value: number, unit: WeightUnit): number {
  return round(value, unit === "lbs" ? 1 : 2);
}

export function kgToUnit(kg: number, unit: WeightUnit): number {
  return unit === "lbs" ? kg / LB_IN_KG : kg;
}

export function unitToKg(value: number, unit: WeightUnit): number {
  return unit === "lbs" ? value * LB_IN_KG : value;
}

/** Converts a value in `unit` to kg rounded to the DB's decimal(5,2) scale. */
export function toStoredKg(value: number, unit: WeightUnit): number {
  return round(unitToKg(value, unit), 2);
}

/** Converts a stored kg value (number or decimal string) for display. */
export function displayWeight(kg: number | string, unit: WeightUnit): number {
  return roundForUnit(kgToUnit(Number(kg), unit), unit);
}

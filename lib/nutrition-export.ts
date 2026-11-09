// Writes calorie rows as a MyFitnessPal "Nutrition Summary" CSV with one
// "Daily total" meal per day, so the file re-imports through `lib/mfp.ts`.

export type NutritionExportRow = {
  date: string; // "YYYY-MM-DD"
  actualCalories: string | number | null;
  proteinG: string | number | null;
  carbsG: string | number | null;
  fatG: string | number | null;
};

export const NUTRITION_CSV_HEADER =
  "Date,Meal,Calories,Fat (g),Carbohydrates (g),Protein (g)";

const num = (v: string | number | null) =>
  v == null ? "0" : String(Number(v));

export function toNutritionCsv(rows: NutritionExportRow[]): string {
  const lines = [...rows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) =>
      [
        r.date,
        "Daily total",
        num(r.actualCalories),
        num(r.fatG),
        num(r.carbsG),
        num(r.proteinG),
      ].join(","),
    );
  return `${[NUTRITION_CSV_HEADER, ...lines].join("\n")}\n`;
}

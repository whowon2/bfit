// Parses a MyFitnessPal "Nutrition Summary" CSV export (one row per meal per
// day) into per-day totals, since MFP exports don't include a daily total row.

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((f) => f !== "")) rows.push(row);
  }

  return rows;
}

export function isMfpNutritionExport(text: string): boolean {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  return firstLine.startsWith("Date,Meal,Calories");
}

export type MfpDailyNutrition = {
  date: Date;
  actualCalories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
};

export function parseMfpNutritionCsv(text: string): MfpDailyNutrition[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];

  const col = (name: string) => header.indexOf(name);
  const dateCol = col("Date");
  const caloriesCol = col("Calories");
  const proteinCol = col("Protein (g)");
  const carbsCol = col("Carbohydrates (g)");
  const fatCol = col("Fat (g)");

  const byDate = new Map<
    string,
    { calories: number; protein: number; carbs: number; fat: number }
  >();

  for (const cols of rows) {
    const dateStr = cols[dateCol];
    if (!dateStr) continue;

    const existing = byDate.get(dateStr) ?? {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    existing.calories += Number(cols[caloriesCol]) || 0;
    existing.protein += Number(cols[proteinCol]) || 0;
    existing.carbs += Number(cols[carbsCol]) || 0;
    existing.fat += Number(cols[fatCol]) || 0;
    byDate.set(dateStr, existing);
  }

  return Array.from(byDate.entries()).map(([dateStr, totals]) => ({
    date: new Date(`${dateStr}T00:00:00`),
    actualCalories: Math.round(totals.calories).toString(),
    proteinG: totals.protein.toFixed(1),
    carbsG: totals.carbs.toFixed(1),
    fatG: totals.fat.toFixed(1),
  }));
}

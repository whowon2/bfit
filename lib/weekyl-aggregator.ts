import { format, startOfWeek } from "date-fns";
import type { Weight } from "../db/schema";

/**
 * Groups weight entries by week and calculates the average weight for each week.
 * The original function had an issue where it reused an 'id' from one of the
 * daily entries for the weekly aggregate, which can cause rendering issues in charts.
 *
 * This revised function corrects that by:
 * 1. Generating a unique, deterministic ID for each weekly average based on the week's start date.
 * 2. Processing values as numbers from the start to make calculations safer.
 * 3. Rounding the final average to one decimal place for cleaner display.
 * 4. Explicitly sorting the final results by date to ensure the chart line is drawn correctly.
 *
 * @param weights - An array of Weight objects.
 * @returns An array of objects representing the weekly average weight, sorted by date.
 */
export function groupByWeek(weights: Weight[]) {
  // An object to hold the week's key and the numeric values for that week.
  const weekly: Record<string, { week: string; values: number[] }> = {};

  for (const w of weights) {
    // First, let's ensure the entry has a valid date before we process it.
    if (!w.date || !(w.date instanceof Date) || isNaN(w.date.getTime())) {
      console.warn("Skipping weight entry with invalid date:", w);
      continue;
    }

    const weekStart = startOfWeek(w.date, { weekStartsOn: 1 }); // Monday-based week
    const weekKey = format(weekStart, "yyyy-MM-dd");

    // Initialize the entry for the week if it's the first time we see it.
    if (!weekly[weekKey]) {
      weekly[weekKey] = { week: weekKey, values: [] };
    }

    // Convert the weight value to a number for calculation.
    const numericValue = parseFloat(w.value);
    if (!isNaN(numericValue)) {
      weekly[weekKey].values.push(numericValue);
    }
  }

  // Map over the grouped weeks to calculate the average.
  const weeklyAverages = Object.values(weekly)
    .map((entry) => {
      // Avoid dividing by zero if a week has no valid values.
      if (entry.values.length === 0) {
        return null;
      }

      const sum = entry.values.reduce((acc, v) => acc + v, 0);
      const average = sum / entry.values.length;
      const weekStartDate = new Date(entry.week);

      return {
        // FIX: Generate a unique ID from the week's timestamp. This is the key change
        // to prevent the charting library from getting confused.
        id: weekStartDate.getTime(),
        date: weekStartDate,
        // Rounding the average to one decimal place makes the data cleaner.
        value: average.toFixed(1),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null); // Filter out any null entries.

  // Finally, sort the results by date to ensure the line graph is drawn in the correct order.
  return weeklyAverages.sort((a, b) => a.date.getTime() - b.date.getTime());
}

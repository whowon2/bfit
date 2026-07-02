import type { Profile } from "@/db/schema";

export function calcBmr({
  weightKg,
  heightCm,
  age,
  sex,
}: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Profile["sex"];
}) {
  const sexOffset = sex === "male" ? 5 : sex === "female" ? -161 : -78;
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset);
}

const ACTIVITY_MULTIPLIERS: Record<
  NonNullable<Profile["activityLevel"]>,
  number
> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
};

// TDEE = BMR scaled by activity level (Harris-Benedict activity multipliers).
export function calcTdee({
  bmr,
  activityLevel,
}: {
  bmr: number;
  activityLevel: Profile["activityLevel"];
}) {
  const multiplier = activityLevel
    ? ACTIVITY_MULTIPLIERS[activityLevel]
    : ACTIVITY_MULTIPLIERS.sedentary;
  return Math.round(bmr * multiplier);
}

// Daily calorie deficit/surplus to reach targetBodyFat within targetWeeks,
// assuming lean mass stays constant (7700 kcal ≈ 1 kg fat).
export function calcDailyCalorieChange({
  weightKg,
  currentBodyFat,
  targetBodyFat,
  targetWeeks,
}: {
  weightKg: number;
  currentBodyFat: number;
  targetBodyFat: number;
  targetWeeks: number;
}) {
  const targetWeightKg = calcTargetWeightKg({
    weightKg,
    currentBodyFat,
    targetBodyFat,
  });
  const deltaKg = targetWeightKg - weightKg;
  const totalKcal = deltaKg * 7700;
  return Math.round(totalKcal / (targetWeeks * 7));
}

export function calcTargetWeightKg({
  weightKg,
  currentBodyFat,
  targetBodyFat,
}: {
  weightKg: number;
  currentBodyFat: number;
  targetBodyFat: number;
}) {
  const leanMassKg = weightKg * (1 - currentBodyFat / 100);
  return leanMassKg / (1 - targetBodyFat / 100);
}

// Protein driven by proteinPerKg (g/kg bodyweight); remaining calories split
// between carbs/fat by carbRatioPercent (share of remaining calories that is carbs).
export function calcMacros({
  weightKg,
  targetCalories,
  proteinPerKg,
  carbRatioPercent,
}: {
  weightKg: number;
  targetCalories: number;
  proteinPerKg: number;
  carbRatioPercent: number;
}) {
  const proteinG = Math.round(weightKg * proteinPerKg);
  const proteinCal = proteinG * 4;
  const remainingCal = Math.max(0, targetCalories - proteinCal);
  const carbsG = Math.round((remainingCal * (carbRatioPercent / 100)) / 4);
  const fatG = Math.round((remainingCal * (1 - carbRatioPercent / 100)) / 9);
  return { proteinG, carbsG, fatG };
}

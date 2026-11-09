import { differenceInYears } from "date-fns";
import type { CalcSnapshot, Profile } from "@/db/schema";
import type { ObservedTdee } from "@/lib/adaptive-tdee";
import { isDayString, parseDay } from "@/lib/dates";

type Goal = NonNullable<Profile["goal"]>;

/**
 * Energy per kg of body-weight change. 7700 kcal/kg is adipose tissue; real
 * loss is mixed tissue (lower density), but the planned deficit and the
 * observed-TDEE estimate both use this one constant, so the closed loop
 * (eat the target -> observe the rate -> re-estimate) stays self-consistent.
 */
export const KCAL_PER_KG = 7700;

/**
 * Message when the goal contradicts the target body fat given the current
 * body fat (cut needs a lower target, bulk a higher one), else null. Unknown
 * current body fat or a maintain goal never conflicts.
 */
export function goalConflict({
  goal,
  currentBodyFat,
  targetBodyFat,
}: {
  goal: Profile["goal"];
  currentBodyFat: number | null;
  targetBodyFat: number | null;
}): string | null {
  if (currentBodyFat === null || targetBodyFat === null) return null;
  if (goal === "cut" && targetBodyFat >= currentBodyFat) {
    return `A cut needs a target body fat below your current ${currentBodyFat}%.`;
  }
  if (goal === "bulk" && targetBodyFat <= currentBodyFat) {
    return `A bulk needs a target body fat above your current ${currentBodyFat}%.`;
  }
  return null;
}

/**
 * The goal sets the direction of the calorie change: maintain → none, cut →
 * never a surplus, bulk → never a deficit (a conflicting target yields 0).
 */
export function applyGoalDirection(change: number, goal: Profile["goal"]) {
  const g: Goal = goal ?? "maintain";
  if (g === "maintain") return 0;
  if (g === "cut") return Math.min(change, 0);
  return Math.max(change, 0);
}

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
// assuming lean mass stays constant (KCAL_PER_KG ≈ 1 kg fat).
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
  const totalKcal = deltaKg * KCAL_PER_KG;
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

export type MaintenanceSource = "formula" | "adaptive" | "blended";

export type MaintenanceChoice = {
  kcal: number | null;
  source: MaintenanceSource;
  /** Observed-estimate confidence (0..1); null when the formula is used. */
  confidence: number | null;
  observedKcal: number | null;
  formulaKcal: number | null;
};

/** At or above this confidence the observed TDEE is used as-is. */
export const ADAPTIVE_FULL_CONFIDENCE = 0.75;

/**
 * The maintenance that drives targets: the observed (adaptive) TDEE when
 * confident (or when there is no formula to fall back on), a
 * confidence-weighted blend with the formula TDEE when less confident, else
 * the formula.
 */
export function chooseMaintenance(
  observed: ObservedTdee | null | undefined,
  formulaKcal: number | null,
): MaintenanceChoice {
  if (!observed?.ok) {
    return {
      kcal: formulaKcal,
      source: "formula",
      confidence: null,
      observedKcal: null,
      formulaKcal,
    };
  }
  const base = {
    confidence: observed.confidence,
    observedKcal: observed.kcal,
    formulaKcal,
  };
  if (formulaKcal === null || observed.confidence >= ADAPTIVE_FULL_CONFIDENCE) {
    return { ...base, kcal: observed.kcal, source: "adaptive" };
  }
  const c = observed.confidence;
  return {
    ...base,
    kcal: Math.round(c * observed.kcal + (1 - c) * formulaKcal),
    source: "blended",
  };
}

// Full BMR/TDEE/target-calorie/macro snapshot for a given profile + latest
// body measurements. Shared by preview UI and profile-history recording so
// both stay in sync with the same math. With `observed` (adaptive TDEE),
// target calories and macros follow `chooseMaintenance`; `tdee` stays the
// formula value.
export function computeCalcSnapshot({
  profile,
  weightKg,
  currentBodyFat,
  observed,
}: {
  profile: Pick<
    Profile,
    | "birthDate"
    | "sex"
    | "height"
    | "activityLevel"
    | "goal"
    | "targetBodyFat"
    | "targetWeeks"
    | "proteinPerKg"
    | "carbRatioPercent"
  >;
  weightKg: number | null;
  currentBodyFat: number | null;
  observed?: ObservedTdee | null;
}): CalcSnapshot {
  const birthDate = isDayString(profile.birthDate)
    ? parseDay(profile.birthDate)
    : new Date(profile.birthDate);
  const age = differenceInYears(new Date(), birthDate);
  const heightCm = profile.height ? Number(profile.height) : null;

  const bmr =
    heightCm !== null && weightKg !== null
      ? calcBmr({ weightKg, heightCm, age, sex: profile.sex })
      : null;

  const tdee =
    bmr !== null
      ? calcTdee({ bmr, activityLevel: profile.activityLevel })
      : null;

  const targetBodyFat = profile.targetBodyFat
    ? Number(profile.targetBodyFat)
    : null;

  const dailyCalorieChange =
    weightKg !== null &&
    currentBodyFat !== null &&
    targetBodyFat !== null &&
    profile.targetWeeks
      ? applyGoalDirection(
          calcDailyCalorieChange({
            weightKg,
            currentBodyFat,
            targetBodyFat,
            targetWeeks: profile.targetWeeks,
          }),
          profile.goal,
        )
      : null;

  const choice = chooseMaintenance(observed, tdee);
  const maintenance =
    choice.kcal !== null
      ? {
          kcal: choice.kcal,
          source: choice.source,
          confidence: choice.confidence,
          observedKcal: choice.observedKcal,
        }
      : null;

  const targetCalories =
    choice.kcal !== null ? choice.kcal + (dailyCalorieChange ?? 0) : null;

  const macros =
    weightKg !== null && targetCalories !== null
      ? calcMacros({
          weightKg,
          targetCalories,
          proteinPerKg: profile.proteinPerKg
            ? Number(profile.proteinPerKg)
            : 1.8,
          carbRatioPercent: profile.carbRatioPercent ?? 50,
        })
      : null;

  return { bmr, tdee, dailyCalorieChange, targetCalories, macros, maintenance };
}

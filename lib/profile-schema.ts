import { z } from "zod";

export const profileFormSchema = z.object({
  birthDate: z.date(),
  sex: z.enum(["male", "female", "other"]),
  height: z.number().min(100).max(300),
  activityLevel: z.enum(["sedentary", "light", "moderate", "high"]),
  goal: z.enum(["cut", "bulk", "maintain"]),
  targetBodyFat: z.number().min(3).max(60),
  targetWeeks: z.number().min(1).max(104),
  carbRatioPercent: z.number().min(0).max(100),
  proteinPerKg: z.number().min(1).max(3),
  maintenanceCalories: z.number().min(0).max(10000),
  currentCalories: z.number().min(0).max(10000),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

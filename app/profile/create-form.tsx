"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createProfile } from "@/actions/weight";
import { FieldInfo } from "@/components/field-info";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { Session } from "@/lib/auth-client";
import { computeCalcSnapshot } from "@/lib/nutrition";
import {
  type ProfileFormValues,
  profileFormSchema,
} from "@/lib/profile-schema";
import { cn } from "@/lib/utils";

export function CreateProfileForm({ session }: { session: Session }) {
  const router = useRouter();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema) as Resolver<ProfileFormValues>,
    defaultValues: {
      birthDate: new Date("02/02/2002"),
      sex: "male",
      height: 180,
      activityLevel: "moderate",
      goal: "maintain",
      targetBodyFat: 15,
      targetWeeks: 12,
      carbRatioPercent: 50,
      proteinPerKg: 1.8,
      maintenanceCalories: 0,
      currentCalories: 0,
    },
  });

  const watched = form.watch();

  const preview = computeCalcSnapshot({
    profile: {
      birthDate: watched.birthDate.toISOString(),
      sex: watched.sex,
      height: watched.height.toString(),
      activityLevel: watched.activityLevel,
      targetBodyFat: watched.targetBodyFat.toString(),
      targetWeeks: watched.targetWeeks,
      proteinPerKg: watched.proteinPerKg.toString(),
      carbRatioPercent: watched.carbRatioPercent,
    },
    weightKg: null,
    currentBodyFat: null,
  });

  async function onSubmit(values: ProfileFormValues) {
    try {
      await createProfile(session.user.id, values);
      toast.success("Profile saved.");
      router.refresh();
    } catch {
      toast.error("Failed to save profile. Please try again.");
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6 w-full max-w-lg"
      >
        <div className="flex flex-col gap-4">
          <h3 className="border-b pb-1 font-semibold text-sm">Personal info</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Birth Date */}
            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of birth</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sex */}
            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sex</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Height */}
            <FormField
              control={form.control}
              name="height"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Height (cm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 175"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="border-b pb-1 font-semibold text-sm">
            Goals & targets
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Activity Level */}
            <FormField
              control={form.control}
              name="activityLevel"
              render={({ field }) => (
                <FormItem>
                  <FieldInfo
                    label="Activity Level"
                    info="Scales BMR into TDEE (maintenance calories): Sedentary ×1.2, Lightly active ×1.375, Moderately active ×1.55 (exercise 3-5 days/week), Highly active ×1.725. Higher activity = higher maintenance calories."
                  />
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select activity level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary</SelectItem>
                      <SelectItem value="light">Lightly active</SelectItem>
                      <SelectItem value="moderate">
                        Moderately active
                      </SelectItem>
                      <SelectItem value="high">Highly active</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Goal */}
            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select goal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cut">Cut</SelectItem>
                      <SelectItem value="bulk">Bulk</SelectItem>
                      <SelectItem value="maintain">Maintain</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Target Body Fat */}
            <FormField
              control={form.control}
              name="targetBodyFat"
              render={({ field }) => (
                <FormItem>
                  <FieldInfo
                    label="Target Body Fat (%)"
                    info="Combined with your timeframe below, this sets the daily calorie surplus/deficit needed to reach it (assumes lean mass stays constant)."
                  />
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 15"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Target Weeks */}
            <FormField
              control={form.control}
              name="targetWeeks"
              render={({ field }) => (
                <FormItem>
                  <FieldInfo
                    label="Timeframe (weeks)"
                    info="How many weeks to reach your target body fat %. Shorter timeframes mean a larger daily calorie deficit/surplus."
                  />
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      placeholder="e.g., 12"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Protein per kg */}
            <FormField
              control={form.control}
              name="proteinPerKg"
              render={({ field }) => (
                <FormItem>
                  <FieldInfo
                    label={`Protein target — ${field.value}g/kg`}
                    info="Grams of protein per kg bodyweight. Typical range: 1-3g/kg. Protein calories are subtracted first; the rest of your target calories are split into carbs/fat below."
                  />
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      onValueChange={([v]) => field.onChange(v)}
                      min={1}
                      max={3}
                      step={0.1}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Carb/Fat Split */}
            <FormField
              control={form.control}
              name="carbRatioPercent"
              render={({ field }) => (
                <FormItem>
                  <FieldInfo
                    label={`Carb / Fat split — Carbs ${field.value}% · Fat ${100 - field.value}%`}
                    info="After protein is subtracted, remaining calories are split between carbs and fat using this ratio (e.g. 50% means half of the leftover calories become carbs, half fat)."
                  />
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      onValueChange={([v]) => field.onChange(v)}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-md border p-3 text-sm">
          <p className="font-medium">Computed from your inputs</p>
          <p className="text-muted-foreground">
            BMR: {preview.bmr ?? "—"} kcal/day · TDEE: {preview.tdee ?? "—"}{" "}
            kcal/day
          </p>
          <p className="text-muted-foreground">
            Log a weight entry after creating your profile to see full macro
            targets.
          </p>
        </div>

        <Button
          type="submit"
          className="mt-2"
          disabled={form.formState.isSubmitting || !form.formState.isDirty}
        >
          {form.formState.isSubmitting ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </Form>
  );
}

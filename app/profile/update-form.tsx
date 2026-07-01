"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useEffect } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { updateProfile } from "@/actions/weight";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
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
import type { Profile } from "@/db/schema";
import type { Session } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export const formSchema = z.object({
  birthDate: z.date(),
  sex: z.enum(["male", "female", "other"]),
  height: z.number().min(100).max(300),
  activityLevel: z.enum(["sedentary", "light", "moderate", "high"]),
  goal: z.enum(["cut", "bulk", "maintain"]),
  targetRate: z.number().min(0).max(1),
  maintenanceCalories: z.number().min(0).max(10000),
  currentCalories: z.number().min(0).max(10000),
});

export function UpdateProfileForm({
  session,
  profile,
}: {
  session: Session;
  profile: Profile;
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as Resolver<z.infer<typeof formSchema>>,
    defaultValues: {
      birthDate: new Date(profile.birthDate),
      sex: profile.sex ?? "male",
      height: profile.height ? Number(profile.height) : 180,
      activityLevel: profile.activityLevel ?? "moderate",
      goal: profile.goal ?? "maintain",
      targetRate: profile.targetRate ? Number(profile.targetRate) : 0.5,
      maintenanceCalories: profile.maintenanceCalories
        ? Number(profile.maintenanceCalories)
        : 0,
      currentCalories: profile.currentCalories
        ? Number(profile.currentCalories)
        : 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);

    await updateProfile(session.user.id, values);
  }

  useEffect(() => {
    console.log("errors", form.formState.errors);
  }, [form.formState]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4 max-w-md w-full"
      >
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
                        "w-[240px] pl-3 text-left font-normal",
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
              <FormDescription>
                Your date of birth is used to calculate your age.
              </FormDescription>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
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

        {/* Activity Level */}
        <FormField
          control={form.control}
          name="activityLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activity Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary</SelectItem>
                  <SelectItem value="light">Lightly active</SelectItem>
                  <SelectItem value="moderate">Moderately active</SelectItem>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
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

        {/* Target Rate */}
        <FormField
          control={form.control}
          name="targetRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Rate (kg/week)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 0.5"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                Ideal: 0.5 for cutting, 0.25 for bulking.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="mt-2">
          Save Profile
        </Button>
      </form>
    </Form>
  );
}

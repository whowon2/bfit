"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateWeightUnit } from "@/actions/settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function WeightUnitSelect({
  userId,
  weightUnit,
}: {
  userId: string;
  weightUnit: "kg" | "lbs";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(value: string) {
    const unit = value as "kg" | "lbs";
    startTransition(async () => {
      try {
        await updateWeightUnit(userId, unit);
        toast.success("Weight unit updated.");
        router.refresh();
      } catch {
        toast.error("Failed to update weight unit. Please try again.");
      }
    });
  }

  return (
    <Select value={weightUnit} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="kg">kg</SelectItem>
        <SelectItem value="lbs">lbs</SelectItem>
      </SelectContent>
    </Select>
  );
}

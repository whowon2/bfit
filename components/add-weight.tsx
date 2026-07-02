"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useRef, useTransition } from "react";
import { addWeightEntry } from "@/actions/weight";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function WeightForm({ userId }: { userId: string }) {
  const [date, setDate] = React.useState<Date>();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        const value = Number(formData.get("value"));
        const entryDate = date ? new Date(date) : new Date();
        startTransition(async () => {
          await addWeightEntry(userId, value, entryDate);
          formRef.current?.reset();
          setDate(undefined);
          router.refresh();
        });
      }}
      className="w-full flex flex-col items-center gap-2 max-w-sm"
    >
      <Input
        type="number"
        name="value"
        step={0.01}
        placeholder="Enter weight"
        required
        className=""
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            data-empty={!date}
            className="data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal"
          >
            <CalendarIcon />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={date} onSelect={setDate} />
        </PopoverContent>
      </Popover>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Adding..." : "Add Entry"}
      </Button>
    </form>
  );
}

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
  const [time, setTime] = React.useState<string>("");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        const value = Number(formData.get("value"));
        const bodyFatRaw = formData.get("bodyFatPercent");
        const bodyFatPercent =
          bodyFatRaw && bodyFatRaw !== "" ? Number(bodyFatRaw) : undefined;
        const entryDate = date ? new Date(date) : new Date();
        if (time) {
          const [hours, minutes] = time.split(":").map(Number);
          entryDate.setHours(hours, minutes, 0, 0);
        }
        startTransition(async () => {
          await addWeightEntry(userId, value, entryDate, bodyFatPercent);
          formRef.current?.reset();
          setDate(undefined);
          setTime("");
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
      <Input
        type="number"
        name="bodyFatPercent"
        step={0.1}
        placeholder="Body fat % (optional)"
        className=""
      />
      <div className="flex w-full gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              data-empty={!date}
              className="data-[empty=true]:text-muted-foreground flex-1 justify-start text-left font-normal"
            >
              <CalendarIcon />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              captionLayout="dropdown"
              selected={date}
              onSelect={setDate}
            />
          </PopoverContent>
        </Popover>
        <Input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-32"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Adding..." : "Add Entry"}
      </Button>
    </form>
  );
}

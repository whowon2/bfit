"use client";

import { format } from "date-fns";
import { CalendarIcon, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateWeightEntry } from "@/actions/weight";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Weight } from "@/db/schema";
import { cn } from "@/lib/utils";

export function EditWeightButton({
  weight,
  userId,
  unit,
}: {
  weight: Weight;
  userId: string;
  unit: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(weight.value);
  const [bodyFatPercent, setBodyFatPercent] = useState(
    weight.bodyFatPercent ?? "",
  );
  const [date, setDate] = useState<Date>(weight.date);
  const [time, setTime] = useState<string>(format(weight.date, "HH:mm"));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    const newValue = Number(value);
    if (Number.isNaN(newValue)) return;

    const newBodyFatPercent =
      bodyFatPercent === "" ? null : Number(bodyFatPercent);
    if (newBodyFatPercent !== null && Number.isNaN(newBodyFatPercent)) return;

    const entryDate = new Date(date);
    if (time) {
      const [hours, minutes] = time.split(":").map(Number);
      entryDate.setHours(hours, minutes, 0, 0);
    }

    startTransition(async () => {
      await updateWeightEntry(
        weight.id,
        userId,
        newValue,
        entryDate,
        newBodyFatPercent,
      );
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      modal={false}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setValue(weight.value);
          setBodyFatPercent(weight.bodyFatPercent ?? "");
          setDate(weight.date);
          setTime(format(weight.date, "HH:mm"));
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit weight</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step={0.01}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1"
            />
            <span className="text-muted-foreground text-sm">{unit}</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step={0.1}
              value={bodyFatPercent}
              onChange={(e) => setBodyFatPercent(e.target.value)}
              placeholder="Body fat %"
              className="flex-1"
            />
            <span className="text-muted-foreground text-sm">%</span>
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                  )}
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
                  onSelect={(d) => d && setDate(d)}
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

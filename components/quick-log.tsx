"use client";

import { format } from "date-fns";
import { CalendarIcon, Check, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { addWeightEntry } from "@/actions/weight";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Weight } from "@/db/schema";
import { formatDay, parseDay } from "@/lib/dates";
import { displayWeight, toStoredKg, type WeightUnit } from "@/lib/units";
import { cn } from "@/lib/utils";

const STEP: Record<WeightUnit, number> = { kg: 0.1, lbs: 0.2 };

/**
 * The dashboard's primary action: log (or update) today's weigh-in. Prefilled
 * with the latest weight in the user's unit; "Another day" backfills. Uses the
 * per-day upsert in `addWeightEntry`, so logging twice updates the day.
 */
export function QuickLog({
  latest,
  todayEntry,
  today,
  unit,
}: {
  latest: Weight | null;
  todayEntry: Weight | null;
  /** Today in the user's timezone ("YYYY-MM-DD"), decided on the server. */
  today: string;
  unit: WeightUnit;
}) {
  const ids = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(
    latest ? String(displayWeight(latest.value, unit)) : "",
  );
  const [bodyFat, setBodyFat] = useState("");
  const [otherDay, setOtherDay] = useState(false);
  const [date, setDate] = useState<Date>(parseDay(today));
  const [time, setTime] = useState("");

  const todayDate = parseDay(today);
  const day = otherDay ? formatDay(date) : today;
  const isToday = day === today;
  const label = isToday
    ? todayEntry
      ? "Update today"
      : "Log today"
    : `Log ${format(date, "MMM d")}`;

  function step(direction: 1 | -1) {
    const current =
      Number(value) || (latest ? Number(displayWeight(latest.value, unit)) : 0);
    const next = Math.max(0, current + direction * STEP[unit]);
    setValue(next.toFixed(1));
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error(`Enter your weight in ${unit}.`);
      return;
    }
    const bf = bodyFat.trim() === "" ? undefined : Number(bodyFat);
    if (bf !== undefined && (!Number.isFinite(bf) || bf < 0 || bf > 100)) {
      toast.error("Body fat must be between 0 and 100%.");
      return;
    }
    startTransition(async () => {
      try {
        const { replaced } = await addWeightEntry({
          value: toStoredKg(n, unit), // server actions take kg
          bodyFatPercent: bf,
          // Omitted = today in the user's timezone, resolved on the server.
          date: isToday ? undefined : day,
          time: otherDay && time ? time : null,
        });
        const when = isToday ? "today's" : `${format(date, "MMM d")}'s`;
        toast.success(
          replaced
            ? `Updated ${when} entry: ${n} ${unit}.`
            : `Logged ${n} ${unit}${isToday ? " for today" : ""}.`,
        );
        setBodyFat("");
        router.refresh();
      } catch {
        toast.error("Couldn't save that weigh-in. Check the values and retry.");
      }
    });
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Today</CardTitle>
        <CardDescription>{format(todayDate, "EEEE, MMMM d")}</CardDescription>
        <CardAction>
          {todayEntry ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 text-xs dark:text-emerald-400">
              <Check className="size-3.5" aria-hidden />
              Logged {displayWeight(todayEntry.value, unit)} {unit}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
              Not logged yet
            </span>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor={`${ids}-weight`}>Weight</Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-12 shrink-0"
                  onClick={() => step(-1)}
                  aria-label={`Decrease by ${STEP[unit]} ${unit}`}
                >
                  <Minus />
                </Button>
                <div className="relative min-w-0 flex-1">
                  <Input
                    id={`${ids}-weight`}
                    type="number"
                    inputMode="decimal"
                    step={0.01}
                    min={0}
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={unit === "kg" ? "75.0" : "165.0"}
                    className="h-12 pr-11 text-center font-semibold text-2xl tabular-nums md:text-2xl"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground text-sm">
                    {unit}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-12 shrink-0"
                  onClick={() => step(1)}
                  aria-label={`Increase by ${STEP[unit]} ${unit}`}
                >
                  <Plus />
                </Button>
              </div>
            </div>
            <div className="flex w-24 shrink-0 flex-col gap-1.5">
              <Label htmlFor={`${ids}-bf`}>Body fat</Label>
              <div className="relative">
                <Input
                  id={`${ids}-bf`}
                  type="number"
                  inputMode="decimal"
                  step={0.1}
                  min={0}
                  max={100}
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  placeholder="opt."
                  className="h-12 pr-7 tabular-nums"
                />
                <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-muted-foreground text-sm">
                  %
                </span>
              </div>
            </div>
          </div>

          {otherDay && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 justify-start font-normal"
                  >
                    <CalendarIcon />
                    {format(date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    disabled={(d) => d > todayDate}
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                aria-label="Time (optional)"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-32"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="lg"
              className="flex-1"
              disabled={isPending}
            >
              {isPending ? "Saving…" : label}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className={cn(otherDay && "text-muted-foreground")}
              onClick={() => {
                setOtherDay((v) => !v);
                setDate(todayDate);
                setTime("");
              }}
            >
              {otherDay ? "Use today" : "Another day"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

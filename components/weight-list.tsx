"use client";

import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import WeightForm from "@/components/add-weight";
import type { Weight } from "@/db/schema";
import type { Session } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { EditWeightButton } from "./edit-weight";
import { ExportJsonButton } from "./export-json";
import { ImportWeightsButton } from "./import-weights";
import { RemoveWeightButton } from "./remove-weight";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function WeightList({
  weights,
  unit,
  userId,
  session,
}: {
  weights: Weight[];
  unit: string;
  userId: string;
  session: Session;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const sorted = [...weights].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );

  const monthStats = new Map<string, { avg: number; diff: number | null }>();
  const monthGroups = new Map<
    string,
    { total: number; count: number; time: number }
  >();
  for (const w of weights) {
    const key = format(w.date, "MMMM yyyy");
    const group = monthGroups.get(key) ?? {
      total: 0,
      count: 0,
      time: w.date.getTime(),
    };
    group.total += parseFloat(w.value);
    group.count += 1;
    monthGroups.set(key, group);
  }
  const orderedMonths = [...monthGroups.entries()].sort(
    (a, b) => a[1].time - b[1].time,
  );
  orderedMonths.forEach(([key, group], i) => {
    const avg = group.total / group.count;
    const prevAvg =
      i > 0
        ? orderedMonths[i - 1][1].total / orderedMonths[i - 1][1].count
        : null;
    monthStats.set(key, { avg, diff: prevAvg === null ? null : avg - prevAvg });
  });

  return (
    <Card
      className={cn(
        "h-[500px] lg:h-full transition-[width,max-width] duration-200 overflow-hidden",
        collapsed ? "w-14 lg:max-w-14" : "w-full lg:max-w-xs",
      )}
    >
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <CardTitle
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          {!collapsed && "Weights"}
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              collapsed && "-rotate-90",
            )}
          />
        </CardTitle>
      </CardHeader>
      {!collapsed && (
        <CardContent className="flex-1 min-h-0 overflow-auto px-2">
          <WeightForm userId={userId} />
          <div className="flex w-full max-w-sm mx-auto mt-2 items-center gap-2 pb-3">
            <ImportWeightsButton session={session} />
            <ExportJsonButton weights={weights} />
          </div>
          <AnimatePresence initial={false}>
            {sorted.map((w, i) => {
              const month = format(w.date, "MMMM yyyy");
              const showMonth =
                i === 0 || month !== format(sorted[i - 1].date, "MMMM yyyy");
              return (
                <motion.div
                  key={w.id}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {showMonth &&
                    (() => {
                      const stats = monthStats.get(month);
                      return (
                        <div className="flex items-center gap-2 px-2 pt-3 pb-1 first:pt-1">
                          <span className="text-muted-foreground shrink-0 text-xs font-semibold uppercase tracking-wide">
                            {month}
                          </span>
                          <hr className="border-border flex-1" />
                          {stats && (
                            <span className="shrink-0 text-xs">
                              <span className="font-medium">
                                {stats.avg.toFixed(1)}
                              </span>
                              {stats.diff !== null && (
                                <span
                                  className={cn(
                                    "ml-1 font-medium",
                                    stats.diff > 0
                                      ? "text-red-500"
                                      : stats.diff < 0
                                        ? "text-green-500"
                                        : "text-muted-foreground",
                                  )}
                                >
                                  ({stats.diff > 0 ? "+" : ""}
                                  {stats.diff.toFixed(1)})
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -8,
                      scale: 0.98,
                      filter: "blur(4px)",
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      filter: "blur(0px)",
                    }}
                    exit={{
                      opacity: 0,
                      y: 8,
                      scale: 0.98,
                      filter: "blur(4px)",
                    }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2.5 hover:bg-accent/50"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {w.value}
                        <span className="text-muted-foreground ml-1 text-sm font-normal">
                          {unit}
                        </span>
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {format(w.date, "MMM d, yyyy · h:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <EditWeightButton
                        weight={w}
                        userId={userId}
                        unit={unit}
                      />
                      <RemoveWeightButton weightId={w.id} />
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </CardContent>
      )}
    </Card>
  );
}

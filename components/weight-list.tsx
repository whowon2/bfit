"use client";

import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Weight } from "@/db/schema";
import { cn } from "@/lib/utils";
import { EditWeightButton } from "./edit-weight";
import { RemoveWeightButton } from "./remove-weight";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function WeightList({
  weights,
  unit,
  userId,
}: {
  weights: Weight[];
  unit: string;
  userId: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const sorted = [...weights].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );

  return (
    <Card
      className={cn(
        "h-full transition-[width,max-width] duration-200 overflow-hidden",
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
                  {showMonth && (
                    <div className="text-muted-foreground px-2 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide first:pt-1">
                      {month}
                    </div>
                  )}
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

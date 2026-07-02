"use client";

import { format } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import type { Weight } from "@/db/schema";
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
  return (
    <Card className="w-full lg:max-w-md">
      <CardHeader>
        <CardTitle>Weights</CardTitle>
      </CardHeader>
      <CardContent className="max-h-150 overflow-auto px-2">
        <AnimatePresence initial={false}>
          {weights
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .map((w) => (
              <motion.div
                key={w.id}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
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
                    <EditWeightButton weight={w} userId={userId} unit={unit} />
                    <RemoveWeightButton weightId={w.id} />
                  </div>
                </motion.div>
              </motion.div>
            ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

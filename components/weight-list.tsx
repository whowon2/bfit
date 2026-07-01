"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Weight } from "@/db/schema";
import { RemoveWeightButton } from "./remove-weight";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function WeightList({
  weights,
  unit,
}: {
  weights: Weight[];
  unit: string;
}) {
  return (
    <Card className="w-full lg:max-w-md">
      <CardHeader>
        <CardTitle>Weights</CardTitle>
      </CardHeader>
      <CardContent className="max-h-150 overflow-auto">
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
                className="border-b last:border-none"
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
                  key={w.id}
                  className="flex gap-4 items-center p-2 justify-between"
                >
                  <div>
                    {w.value} {unit}
                  </div>
                  <div>{w.date.toLocaleString()}</div>
                  <RemoveWeightButton weightId={w.id} />
                </motion.div>
              </motion.div>
            ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

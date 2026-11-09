"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useTransition } from "react";
import { removeWeightEntry } from "@/actions/weight";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "./ui/button";

export function RemoveWeightButton({ weightId }: { weightId: number }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRemove() {
    setIsOpen(false);
    startTransition(async () => {
      await removeWeightEntry(weightId);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={isPending}
          aria-label="Delete weigh-in"
        >
          <X size={14} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this weigh-in?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the weight and body fat logged for this
            day. It can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRemove}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

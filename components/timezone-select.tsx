"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateTimezone } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TimezoneSelect({
  timezone,
  options,
}: {
  timezone: string | null;
  options: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function save(tz: string) {
    startTransition(async () => {
      try {
        await updateTimezone(tz);
        toast.success("Timezone updated.");
        router.refresh();
      } catch {
        toast.error("Failed to update timezone. Please try again.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => save(Intl.DateTimeFormat().resolvedOptions().timeZone)}
      >
        Use browser
      </Button>
      <Select
        value={timezone ?? undefined}
        onValueChange={save}
        disabled={isPending}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Not set (UTC)" />
        </SelectTrigger>
        <SelectContent>
          {options.map((tz) => (
            <SelectItem key={tz} value={tz}>
              {tz.replaceAll("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

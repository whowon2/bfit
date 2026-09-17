import { Info } from "lucide-react";
import { FormLabel } from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function FieldInfo({ label, info }: { label: string; info: string }) {
  return (
    <FormLabel className="flex items-center gap-1">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="size-3 cursor-help text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent className="max-w-64">{info}</TooltipContent>
      </Tooltip>
    </FormLabel>
  );
}

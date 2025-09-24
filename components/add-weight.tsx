import { revalidatePath } from "next/cache";
import { addWeightEntry } from "@/actions/weight";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function WeightForm({ userId }: { userId: string }) {
  return (
    <form
      action={async (formData) => {
        "use server";
        const value = Number(formData.get("value"));
        const date = formData.get("date")?.toString();
        console.log(date);
        await addWeightEntry(userId, value, date ? new Date(date) : new Date());
        revalidatePath("dashboard");
      }}
      className="space-y-2 max-w-sm w-full"
    >
      <Input
        type="number"
        name="value"
        step={0.01}
        placeholder="Enter weight"
        required
        className="border rounded px-2 py-1"
      />
      <Input
        type="date"
        name="date"
        defaultValue={Date.now()}
        className="border rounded px-2 py-1"
      />
      <Button type="submit" className="w-full">
        Add Entry
      </Button>
    </form>
  );
}

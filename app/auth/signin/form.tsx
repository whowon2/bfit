"use client";

import { signin } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useActionState } from "react";

const initialState = {
  message: "",
};

export function SigninForm() {
  const [state, formAction, pending] = useActionState(signin, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Input id="email" name="email" type="email" placeholder="Email" />
      <Input
        id="password"
        name="password"
        type="password"
        placeholder="Password"
      />
      {state?.message && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}

      <Button type="submit" className="w-full">
        {pending ? <Loader2 className="animate-spin" /> : "Log In"}
      </Button>
    </form>
  );
}

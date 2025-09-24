"use client";

import { signup } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useActionState } from "react";

const initialState = {
  message: "",
};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Input id="name" name="name" type="text" placeholder="Name" />
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
        {pending ? <Loader2 className="animate-spin" /> : "Sign Up"}
      </Button>
    </form>
  );
}

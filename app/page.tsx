"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="w-full flex-1 flex flex-col items-center justify-center px-6">
      <section className="text-center max-w-2xl space-y-6 -mt-24">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Welcome to <span className="text-primary">BFit</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Track your progress, stay motivated, and reach your fitness goals with
          ease.
        </p>

        <div className="flex gap-4 justify-center">
          <Link href="/auth/signup">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/auth/signin">
            <Button size="lg" variant="outline">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      <footer className="absolute bottom-6 text-sm text-muted-foreground">
        Made with ❤️ for your fitness journey
      </footer>
    </main>
  );
}

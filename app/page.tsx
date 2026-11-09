import Link from "next/link";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    title: "A trend, not a guess",
    body: "Daily weigh-ins are smoothed into a trend weight and a weekly rate, so one salty dinner doesn't look like a setback.",
  },
  {
    title: "Targets from your numbers",
    body: "Add a profile and your goal turns your weight and body fat into calorie and macro targets.",
  },
  {
    title: "Your history comes along",
    body: "Import weights from Lyfta or a BFit export and nutrition from MyFitnessPal. Export any time.",
  },
];

export default function Home() {
  return (
    <main className="flex w-full flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
      <section className="flex max-w-2xl flex-col items-center gap-6 text-center">
        <h1 className="font-bold text-4xl tracking-tight md:text-6xl">BFit</h1>
        <p className="text-lg text-muted-foreground">
          Log your weight in seconds and see where it&apos;s really heading.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/auth/signup">Create an account</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/auth/signin">Sign in</Link>
          </Button>
        </div>
      </section>

      <ul className="mt-16 grid w-full max-w-4xl gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
        {FEATURES.map((f) => (
          <li key={f.title} className="flex flex-col gap-1.5 bg-background p-5">
            <h2 className="font-medium text-sm">{f.title}</h2>
            <p className="text-muted-foreground text-sm">{f.body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

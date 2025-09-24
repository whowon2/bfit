import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  return (
    <div>
      <Link href="/dashboard">
        <Button variant={"link"}>Dashboard</Button>
      </Link>
    </div>
  );
}

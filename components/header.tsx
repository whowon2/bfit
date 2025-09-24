import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { LogoutButton } from "./logout-button";
import { Button } from "./ui/button";

export default async function Header() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <header className="container p-4 w-full flex justify-between items-center">
      <Link href="/">
        <h1 className="font-bold text-xl">BFit</h1>
      </Link>

      {session?.user ? (
        <LogoutButton />
      ) : (
        <Link href="/auth/signin">
          <Button>Login</Button>
        </Link>
      )}
    </header>
  );
}

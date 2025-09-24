import { LogOut } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { logout } from "@/actions/auth";
import { auth } from "@/lib/auth";
import { Button } from "./ui/button";

export default async function Header() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <header className="container p-4 w-full flex justify-between items-center">
      <h1>BFit</h1>

      {session?.user ? (
        <div className="">
          <form action={logout}>
            <Button variant={"outline"}>
              <LogOut />
            </Button>
          </form>
        </div>
      ) : (
        <Link href="/auth/signin">
          <Button>Login</Button>
        </Link>
      )}
    </header>
  );
}

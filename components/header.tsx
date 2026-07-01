import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { LogoutButton } from "./logout-button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
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
        <div className="flex gap-2">
          <Link href="/profile">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </Link>
          <LogoutButton />
        </div>
      ) : (
        <Link href="/auth/signin">
          <Button>Login</Button>
        </Link>
      )}
    </header>
  );
}

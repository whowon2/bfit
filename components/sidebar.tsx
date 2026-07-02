import { Dumbbell, LayoutDashboard, LogIn, User } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { LogoutButton } from "./logout-button";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export default async function Sidebar() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col items-center justify-between border-border border-r py-4">
      <div className="flex flex-col items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/">
              <Button variant="ghost" size="icon">
                <Dumbbell />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>BFit</p>
          </TooltipContent>
        </Tooltip>

        {session?.user && (
          <nav className="flex flex-col items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/dashboard">
                  <Button variant="ghost" size="icon">
                    <LayoutDashboard />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Dashboard</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/profile">
                  <Button variant="ghost" size="icon">
                    <User />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Profile</p>
              </TooltipContent>
            </Tooltip>
          </nav>
        )}
      </div>

      {session?.user ? (
        <LogoutButton />
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/auth/signin">
              <Button variant="ghost" size="icon">
                <LogIn />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Login</p>
          </TooltipContent>
        </Tooltip>
      )}
    </aside>
  );
}

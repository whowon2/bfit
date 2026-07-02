import {
  Dumbbell,
  LayoutDashboard,
  LogIn,
  Settings,
  User,
  Utensils,
} from "lucide-react";
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
    <aside className="sticky top-0 z-40 flex h-14 w-full shrink-0 flex-row items-center justify-between border-border border-b px-2 md:h-screen md:w-16 md:flex-col md:justify-between md:border-r md:border-b-0 md:px-0 md:py-4">
      <div className="flex flex-row items-center gap-2 md:flex-col md:gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/">
              <Button variant="ghost" size="icon">
                <Dumbbell />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>BFit</p>
          </TooltipContent>
        </Tooltip>

        {session?.user && (
          <nav className="flex flex-row items-center gap-1 md:flex-col">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/dashboard">
                  <Button variant="ghost" size="icon">
                    <LayoutDashboard />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">
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
              <TooltipContent side="bottom">
                <p>Profile</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/nutrition">
                  <Button variant="ghost" size="icon">
                    <Utensils />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Nutrition</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/settings">
                  <Button variant="ghost" size="icon">
                    <Settings />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Settings</p>
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
          <TooltipContent side="bottom">
            <p>Login</p>
          </TooltipContent>
        </Tooltip>
      )}
    </aside>
  );
}

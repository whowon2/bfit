import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getProfile } from "@/actions/weight";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { CreateProfileForm } from "../profile/create-form";
import { UpdateProfileForm } from "../profile/update-form";

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/signin");
  }

  const profile = await getProfile(session.user.id);

  if (!profile) {
    return <CreateProfileForm session={session} />;
  }

  return (
    <div className="container flex flex-col gap-6 p-4 items-center w-full max-w-md mx-auto">
      <div className="w-full">
        <h1 className="font-bold text-2xl">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Update your details and goals.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
          <CardDescription>
            Update your details to keep calorie and rate targets accurate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpdateProfileForm session={session} profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}

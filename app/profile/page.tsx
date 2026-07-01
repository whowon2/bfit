import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile } from "@/actions/weight";
import { auth } from "@/lib/auth";
import { CreateProfileForm } from "./create-form";
import { UpdateProfileForm } from "./update-form";

const _formSchema = z.object({
  username: z.string().min(2).max(50),
});

export default async function DashboardPage() {
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
    <div className="p-4">
      <h1 className="font-bold text-xl">Profile</h1>
      <pre>{JSON.stringify(profile, null, 2)}</pre>
      <UpdateProfileForm session={session} profile={profile} />
    </div>
  );
}

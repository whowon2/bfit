import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signup } from "@/actions/auth";
import { auth } from "@/lib/auth";

export default async function AuthPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="p-8">
      <h1 className="font-bold">Auth Page</h1>
      <p>Please log in to access the dashboard.</p>

      <form action={signup}>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="Email"
          className="mt-4 block border p-2"
        />
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Password"
          className="mt-4 block border p-2"
        />
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Name"
          className="mt-4 block border p-2"
        />
        <button
          type="submit"
          className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Log In
        </button>
      </form>
    </div>
  );
}

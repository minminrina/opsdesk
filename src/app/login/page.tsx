import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user?.role === "admin" || user?.role === "manager") {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7fb] px-6 py-12 text-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
            O
          </div>

          <span className="text-2xl font-bold tracking-tight">
            OpsDesk
          </span>
        </div>

        <h1 className="mt-10 text-2xl font-bold tracking-tight">
          Welcome back
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Sign in to manage orders and keep your operations moving.
        </p>

        <LoginForm />

        <p className="mt-6 text-center text-xs text-slate-400">
          Employee access only
        </p>
      </div>
    </main>
  );
}
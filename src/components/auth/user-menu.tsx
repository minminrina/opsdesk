"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type UserMenuProps = {
  user: {
    name: string;
    role: string;
  };
};

export function UserMenu({ user }: UserMenuProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setError(null);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setError("Could not sign out. Try again.");
        return;
      }

      window.location.assign("/login");
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="text-right">
        <p className="text-sm font-semibold text-slate-900">
          {user.name}
        </p>
        <p className="text-xs capitalize text-slate-500">
          {user.role}
        </p>
      </div>

      {user.role === "admin" && (
        <Link
          href="/admin/users"
          className="rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
        >
          Employees
        </Link>
      )}

      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        {isSigningOut ? "Signing out..." : "Sign out"}
      </button>

      {error && (
        <p role="alert" className="w-full text-right text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
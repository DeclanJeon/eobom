"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="w-full rounded-full border border-border px-4 py-2.5 text-sm"
    >
      로그아웃
    </button>
  );
}

"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginButton({ callbackUrl }: { callbackUrl: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await signIn("google", { callbackUrl });
      }}
      className="cta-primary w-full py-4 disabled:opacity-60"
    >
      {loading ? "연결 중…" : "Google로 계속하기"}
    </button>
  );
}

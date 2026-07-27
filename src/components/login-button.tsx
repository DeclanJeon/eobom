"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginButton({
  callbackUrl,
  claimSlug,
  label = "Google로 계속하기",
}: {
  callbackUrl: string;
  claimSlug?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          if (claimSlug) {
            await fetch("/api/seats/claim-intent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slug: claimSlug }),
            });
          }
          await signIn("google", { callbackUrl });
        } finally {
          setLoading(false);
        }
      }}
      className="cta-primary w-full py-4 disabled:opacity-60"
    >
      {loading ? "연결 중…" : label}
    </button>
  );
}

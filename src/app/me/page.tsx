import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SurfaceCard } from "@/components/ui-blocks";
import { SignOutButton } from "@/components/sign-out-button";
import { requireUser } from "@/lib/session";

export const metadata = { title: "내 정보" };

export default async function MePage() {
  const user = await requireUser();

  return (
    <AppShell bare>
      <header className="mb-8">
        <h1 className="text-display-lg text-primary">
          {user.displayName || user.name || "사용자"}
        </h1>
        <p className="mt-2 text-label-md text-text-muted">{user.email}</p>
      </header>

      <div className="space-y-3">
        {[
          { href: "/me/qr", label: "내 QR · 개인 주소" },
          { href: "/me/settings", label: "설정" },
          { href: "/me/export", label: "내보내기" },
          { href: "/contact", label: "문의" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <SurfaceCard className="mb-2 transition hover:border-accent-gold/30">
              <p className="text-label-md text-primary">{item.label}</p>
            </SurfaceCard>
          </Link>
        ))}
        <div className="pt-2">
          <SignOutButton />
        </div>
      </div>
    </AppShell>
  );
}

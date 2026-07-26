import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SurfaceCard } from "@/components/ui-blocks";
import { SignOutButton } from "@/components/sign-out-button";
import { requireUser } from "@/lib/session";

export const metadata = { title: "내 정보" };

export default async function MePage() {
  const user = await requireUser();

  return (
    <AppShell title="나">
      <div className="mb-6">
        <h1 className="font-serif text-2xl tracking-tight">
          {user.displayName || user.name || "사용자"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      </div>

      <div className="space-y-2">
        {[
          { href: "/me/qr", label: "내 QR · 개인 주소" },
          { href: "/me/settings", label: "설정" },
          { href: "/me/export", label: "내보내기" },
          { href: "/contact", label: "문의" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <SurfaceCard className="transition hover:border-primary/25">
              <p className="font-medium">{item.label}</p>
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

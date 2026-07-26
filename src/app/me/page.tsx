import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageIntro, SurfaceCard } from "@/components/ui-blocks";
import { SignOutButton } from "@/components/sign-out-button";
import { requireUser } from "@/lib/session";
import { appUrl } from "@/lib/utils";

export const metadata = { title: "내 정보" };

export default async function MePage() {
  const user = await requireUser();
  const journalUrl = appUrl(`/j/${user.personalSlug}`);

  return (
    <AppShell title="내 정보">
      <PageIntro
        title={user.displayName || user.name || "내 정보"}
        description={user.email || ""}
      />

      <div className="space-y-3">
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">개인 묵상기록지</p>
          <p className="mt-1 break-all font-mono text-sm">{journalUrl}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={`/j/${user.personalSlug}`} className="text-sm text-primary">
              페이지 열기
            </Link>
            <Link href="/me/qr" className="text-sm text-primary">
              QR 코드
            </Link>
          </div>
        </SurfaceCard>

        {[
          { href: "/me/settings", label: "설정 · AI 동의" },
          { href: "/me/export", label: "데이터 내보내기" },
          { href: "/me/qr", label: "내 QR 코드" },
          { href: "/contact", label: "문의하기" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <SurfaceCard className="transition hover:border-primary/25">
              <p className="font-medium">{item.label}</p>
            </SurfaceCard>
          </Link>
        ))}

        <SurfaceCard>
          <SignOutButton />
        </SurfaceCard>
      </div>
    </AppShell>
  );
}

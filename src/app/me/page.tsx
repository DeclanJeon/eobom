import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageIntro, SurfaceCard } from "@/components/ui-blocks";
import { SignOutButton } from "@/components/sign-out-button";
import { requireUser } from "@/lib/session";
import { appUrl } from "@/lib/utils";
import { appVersionLabel } from "@/lib/version";

export const metadata = { title: "내 정보" };

export default async function MePage() {
  const user = await requireUser();
  const journalUrl = appUrl(`/j/${user.personalSlug}`);

  return (
    <AppShell wide bare>
      <section className="mb-8 max-w-3xl md:mb-10 md:grid md:grid-cols-[1fr_auto] md:items-end md:gap-10">
        <div>
          <PageIntro
            className="mb-0"
            eyebrow="계정"
            title={user.displayName || user.name || "사용자"}
          />
          <p className="mt-2 text-label-md text-text-muted">{user.email}</p>
          <p className="mt-3 break-all font-mono text-label-sm text-text-muted">
            {journalUrl}
          </p>
        </div>
        <div className="mt-5 md:mt-0">
          <Link href="/entries/new" className="cta-primary inline-flex">
            기록하기
          </Link>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            href: "/me/qr",
            label: "내 QR · 개인 주소",
            desc: "키링·공유용 주소",
          },
          { href: "/me/settings", label: "설정", desc: "이름, AI 동의, 번역" },
          { href: "/me/export", label: "내보내기", desc: "JSON · Markdown" },
          { href: "/contact", label: "문의", desc: "도움이 필요할 때" },
          {
            href: "/suggest",
            label: "제안하기",
            desc: "기능 추가 · 개편 · 개선",
          },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <SurfaceCard className="h-full transition hover:border-accent-gold/30">
              <p className="text-label-md text-primary">{item.label}</p>
              <p className="mt-1 text-label-sm text-text-muted">{item.desc}</p>
            </SurfaceCard>
          </Link>
        ))}
      </div>

      <div className="mt-8 max-w-sm space-y-3">
        <SignOutButton />
        <p className="text-label-sm text-text-muted">
          이어봄 {appVersionLabel()}
        </p>
      </div>
    </AppShell>
  );
}

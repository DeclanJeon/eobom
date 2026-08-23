import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageIntro, SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { anonName } from "@/lib/anon-name";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/utils";
import { appVersionLabel } from "@/lib/version";

export const metadata = { title: "내 정보" };

export default async function MePage() {
  const user = await requireUser();
  const journalUrl = appUrl(`/j/${user.personalSlug}`);
  const prayerCount = await db.prayerTopic.count({
    where: { userId: user.id, status: "continuing" },
  });

  return (
    <AppShell wide bare>
      <section className="mb-8 max-w-3xl md:mb-10 md:grid md:grid-cols-[1fr_auto] md:items-end md:gap-10">
        <div>
          <PageIntro
            className="mb-0"
            title={user.displayName || user.name || anonName(user.id)}
          />
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
          { href: "/me/export", label: "데이터 이동", desc: "내보내기 · 가져오기" },
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

      <Link href="/me/prayers" className="mt-3 block">
        <SurfaceCard className="transition hover:border-accent-gold/30">
          <p className="text-label-md text-primary">기도 제목 {prayerCount} →</p>
          <p className="mt-1 text-label-sm text-text-muted">묵상에서 이어지는 기도</p>
        </SurfaceCard>
      </Link>

      <div className="mt-8 max-w-sm space-y-3">
        <p className="text-label-sm text-text-muted">
          이어봄 {appVersionLabel()}
        </p>
      </div>
    </AppShell>
  );
}

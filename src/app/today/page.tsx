import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, PageIntro, SoftBadge, SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { excerpt, formatDateKo, parseJsonArray } from "@/lib/utils";

export const metadata = { title: "오늘" };

export default async function TodayPage() {
  const user = await requireUser();
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const [todayEntries, recent, latestReview, pendingActions] =
    await Promise.all([
      db.reflectionEntry.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          entryDate: { gte: start, lte: end },
        },
        orderBy: { entryDate: "desc" },
      }),
      db.reflectionEntry.findMany({
        where: { userId: user.id, deletedAt: null },
        orderBy: { entryDate: "desc" },
        take: 3,
      }),
      db.reviewReport.findFirst({
        where: { userId: user.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
      db.actionStep.findMany({
        where: { userId: user.id, status: "pending" },
        orderBy: { createdAt: "desc" },
        take: 2,
      }),
    ]);

  // refine past-today by month/day
  const pastFiltered = (
    await db.reflectionEntry.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { entryDate: "desc" },
      take: 400,
    })
  )
    .filter((e) => {
      const d = e.entryDate;
      return (
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate() &&
        d.getFullYear() < now.getFullYear()
      );
    })
    .slice(0, 2);

  return (
    <AppShell
      title="오늘"
      action={
        <Link
          href="/entries/new"
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          기록하기
        </Link>
      }
    >
      <PageIntro
        eyebrow={formatDateKo(now)}
        title={`${user.displayName || "순례자"}님, 오늘의 기록`}
        description="부담 없이 한 줄이라도 남기면 충분합니다. AI는 기록이 쌓인 뒤에만 선택적으로 사용하세요."
      />

      <div className="space-y-4">
        <SurfaceCard className="bg-[linear-gradient(135deg,#f7faf5,#fffaf0)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">빠른 시작</p>
              <h2 className="mt-1 font-serif text-2xl">묵상 기록하기</h2>
            </div>
            <Link
              href="/entries/new"
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
            >
              새 기록
            </Link>
          </div>
          {todayEntries.length > 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              오늘 이미 {todayEntries.length}개의 기록이 있습니다.
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              아직 오늘의 기록이 없습니다.
            </p>
          )}
        </SurfaceCard>

        {latestReview ? (
          <SurfaceCard>
            <div className="flex items-center gap-2">
              <SoftBadge>최근 회고</SoftBadge>
            </div>
            <p className="mt-3 font-serif text-xl leading-snug">
              {latestReview.summary || "저장된 회고가 있습니다."}
            </p>
            <Link
              href={`/reviews/${latestReview.id}`}
              className="mt-3 inline-block text-sm text-primary"
            >
              회고 다시 보기
            </Link>
          </SurfaceCard>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">최근 기록</h2>
            <Link href="/entries" className="text-sm text-primary">
              모두 보기
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              title="아직 기록이 없습니다"
              description="첫 묵상을 남기면 이곳이 채워집니다."
              action={
                <Link
                  href="/entries/new"
                  className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
                >
                  첫 기록 남기기
                </Link>
              }
            />
          ) : (
            recent.map((entry) => (
              <Link key={entry.id} href={`/entries/${entry.id}`}>
                <SurfaceCard className="mb-3 transition hover:border-primary/30">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {formatDateKo(entry.entryDate)}
                    </p>
                    {parseJsonArray(entry.scriptureRefs)[0] ? (
                      <SoftBadge>{parseJsonArray(entry.scriptureRefs)[0]}</SoftBadge>
                    ) : null}
                  </div>
                  <h3 className="mt-2 font-serif text-lg">
                    {entry.title || "제목 없음"}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {excerpt(entry.reflectionBody, 110)}
                  </p>
                </SurfaceCard>
              </Link>
            ))
          )}
        </section>

        {pastFiltered.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-serif text-xl">과거의 오늘</h2>
            {pastFiltered.map((entry) => (
              <Link key={entry.id} href={`/entries/${entry.id}`}>
                <SurfaceCard className="mb-3">
                  <p className="text-xs text-muted-foreground">
                    {formatDateKo(entry.entryDate)}
                  </p>
                  <h3 className="mt-2 font-serif text-lg">
                    {entry.title || "제목 없음"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {excerpt(entry.reflectionBody, 100)}
                  </p>
                </SurfaceCard>
              </Link>
            ))}
          </section>
        ) : null}

        {pendingActions.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-serif text-xl">다시 볼 결단</h2>
            <p className="text-sm text-muted-foreground">
              미완료를 탓하지 않습니다. 필요할 때만 부드럽게 다시 만납니다.
            </p>
            {pendingActions.map((step) => (
              <SurfaceCard key={step.id}>
                <p className="text-sm leading-relaxed">{step.body}</p>
              </SurfaceCard>
            ))}
          </section>
        ) : null}

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">나의 묵상기록지</p>
          <p className="mt-1 font-mono text-sm">/j/{user.personalSlug}</p>
          <Link href="/me/qr" className="mt-3 inline-block text-sm text-primary">
            QR 코드 보기
          </Link>
        </SurfaceCard>
      </div>
    </AppShell>
  );
}

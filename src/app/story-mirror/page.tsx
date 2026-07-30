/**
 * /story-mirror — 이야기 거울 메인 페이지
 *
 * 사용자의 매칭 결과와 카드 탐색을 제공한다.
 */

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import {
  getLatestRun,
  getLatestRagRun,
  getLatestReviewStoryMirror,
} from "@/lib/story-mirror/db";
import { parseJsonArray } from "@/lib/utils";

export const metadata = { title: "이야기 거울" };

export default async function StoryMirrorPage() {
  const user = await requireUser();
  const run = await getLatestRun(user.id);
  const latestRagRun = await getLatestRagRun(user.id);
  const reviewMirror = await getLatestReviewStoryMirror(user.id);
  const hasReview =
    (await db.reviewReport.count({
      where: { userId: user.id, deletedAt: null },
    })) > 0;

  const ragMatches =
    latestRagRun?.matches.filter((match) => Boolean(match.connection?.trim())) ?? [];

  return (
    <AppShell wide bare>
      <section className="mb-8 max-w-2xl md:mb-10">
        <p className="text-eyebrow text-accent-gold-ink">이야기 거울</p>
        <h1 className="mt-2 text-display-lg text-primary md:text-4xl">
          수천 년 전의 사람도 같은 질문을 했습니다
        </h1>
        <p className="mt-3 text-body-md text-text-muted">
          당신의 묵상 기록에서 반복되는 주제와 감정을 고전 속 이야기와 연결해
          드립니다. 정답이 아니라, 다른 관점을 발견할 수 있는 읽을 거리입니다.
        </p>
      </section>

      <div className="mb-6 flex gap-3">
        <Link href="/story-mirror" className="text-label-md text-primary border-b-2 border-primary pb-1">
          이야기
        </Link>
        <Link href="/story-mirror/reflect" className="text-label-md text-text-muted hover:text-primary pb-1">
          연결
        </Link>
        <Link href="/story-mirror/visualize" className="text-label-md text-text-muted hover:text-primary pb-1">
          시각화
        </Link>
      </div>

      {run && run.matches.length > 0 ? (
        <div className="space-y-6">
          <div>
            <p className="text-label-md text-text-muted">
              최근 매칭 ·{" "}
              {run.completedAt
                ? new Date(run.completedAt).toLocaleDateString("ko-KR")
                : ""}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {run.matches.map((match) => {
              const warnings = parseJsonArray(match.card.contentWarnings);
              return (
                <Link key={match.id} href={`/story-mirror/${match.card.id}`}>
                  <SurfaceCard className="h-full transition hover:border-accent-gold/30">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-label-sm text-text-muted">
                          {match.card.work.title} · {match.card.work.author}
                        </p>
                        <h2 className="mt-1 text-headline-sm text-primary">
                          {match.card.name}
                        </h2>
                      </div>
                      {warnings.length > 0 && (
                        <span className="shrink-0 rounded-full bg-safety/10 px-2 py-0.5 text-label-xs text-safety">
                          주의
                        </span>
                      )}
                    </div>
                    {match.narrativeBridge && (
                      <p className="mt-2 line-clamp-3 text-body-md text-text-muted">
                        {match.narrativeBridge}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {parseJsonArray(match.matchThemes)
                        .slice(0, 3)
                        .map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-chalk px-2 py-0.5 text-label-xs text-text-muted"
                          >
                            {t}
                          </span>
                        ))}
                    </div>
                  </SurfaceCard>
                </Link>
              );
            })}
          </div>
        </div>
      ) : ragMatches.length === 0 && reviewMirror && reviewMirror.storyConnections.length > 0 ? (
        <div className="space-y-3">
          <p className="text-label-md text-text-muted">
            회고에서 닿은 이야기 ·{" "}
            {new Date(reviewMirror.periodStart).toLocaleDateString("ko-KR")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reviewMirror.storyConnections.map((sc, i) => (
              <SurfaceCard key={i} className="h-full">
                <p className="text-label-sm text-text-muted">{sc.source}</p>
                <h2 className="mt-1 text-headline-sm text-primary">{sc.story}</h2>
                <p className="mt-2 line-clamp-3 text-body-md text-text-muted">
                  {sc.connection}
                </p>
                {sc.differentPerspective && (
                  <p className="mt-3 rounded-xl bg-chalk p-3 text-body-sm text-text-muted">
                    다른 시선 · {sc.differentPerspective}
                  </p>
                )}
              </SurfaceCard>
            ))}
          </div>
        </div>
      ) : ragMatches.length > 0 ? (
        <div className="space-y-3">
          <p className="text-label-md text-text-muted">회고에서 닿은 이야기 · 연결</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ragMatches.map((m) => (
              <SurfaceCard key={m.id} className="h-full">
                <p className="text-label-sm text-text-muted">
                  {m.chunk.work.title}
                  {m.chunk.locator ? ` · ${m.chunk.locator}` : ""}
                </p>
                <h2 className="mt-1 text-headline-sm text-primary">
                  {m.chunk.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-body-md text-text-muted">
                  {m.connection}
                </p>
                {m.differentPerspective && (
                  <p className="mt-3 rounded-xl bg-chalk p-3 text-body-sm text-text-muted">
                    다른 시선 · {m.differentPerspective}
                  </p>
                )}
              </SurfaceCard>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title={
            hasReview ? "아직 닿은 이야기가 없어요" : "연결할 회고가 아직 없어요"
          }
          description={
            hasReview
              ? "회고 속 마음을 고전 속 이야기와 잇는 연결을 아직 만들지 않았어요."
              : "회고를 남기시면, 반복되는 주제와 감정을 고전 속 이야기와 연결해 드립니다."
          }
          action={
            <Link
              href={hasReview ? "/story-mirror/reflect" : "/reviews"}
              className="cta-primary"
            >
              {hasReview ? "이야기 찾기" : "회고 생성하기"}
            </Link>
          }
        />
      )}
    </AppShell>
  );
}

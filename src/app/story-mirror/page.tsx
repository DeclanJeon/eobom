/**
 * /story-mirror — 이야기 거울 메인 페이지
 *
 * 사용자의 매칭 결과와 카드 탐색을 제공한다.
 */

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { getLatestRun } from "@/lib/story-mirror/db";
import { parseJsonArray } from "@/lib/utils";

export const metadata = { title: "이야기 거울" };

export default async function StoryMirrorPage() {
  const user = await requireUser();
  const run = await getLatestRun(user.id);

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

      {!run || run.matches.length === 0 ? (
        <EmptyState
          title="아직 연결된 이야기가 없습니다"
          description="묵상 기록을 남기시면, 반복되는 주제와 감정을 고전 속 이야기와 연결해 드립니다."
          action={
            <Link href="/entries/new" className="cta-primary">
              기록하기
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-6">
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
                <Link
                  key={match.id}
                  href={`/story-mirror/${match.card.id}`}
                >
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
        </>
      )}
    </AppShell>
  );
}

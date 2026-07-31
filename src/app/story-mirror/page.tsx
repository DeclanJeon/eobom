/**
 * /story-mirror — 돌아보기 · 이야기
 *
 * 회고에서 닿은 인물/이야기를 "입체 서사"로 보여 준다.
 * 사용자가 자신의 기록이 이미 살았던 인물들의 열망·외로움·변화와 겹침을 느끼도록.
 */

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LookbackTabs } from "@/components/lookback-tabs";
import { EmptyState } from "@/components/ui-blocks";
import { StoryNarrativeCard } from "@/components/story-narrative-card";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import {
  getLatestRun,
  getLatestRagRun,
  getLatestReviewStoryMirror,
} from "@/lib/story-mirror/db";
import { parseJsonArray } from "@/lib/utils";

export const metadata = { title: "돌아보기 · 이야기" };

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
    latestRagRun?.matches.filter((match) => Boolean(match.connection?.trim())) ??
    [];

  return (
    <AppShell wide bare>
      <section className="mb-8 max-w-2xl md:mb-10">
        <p className="text-eyebrow text-accent-gold-ink">이야기 거울</p>
        <h1 className="mt-2 text-display-lg text-primary md:text-4xl">
          당신의 기록과 닮은 마음이
          <span className="mt-1 block">이미 살았던 사람들이 있습니다</span>
        </h1>
        <p className="mt-3 text-body-md text-text-muted">
          회고 속 열망·외로움·자존심·회귀는 당신만의 것이 아닙니다. 고전·성경의
          인물들이 비슷한 마음을 안고 살았고, 그 겹침을 통해 자신의 서사가 더
          입체적으로 다가오도록 돕습니다.
        </p>
      </section>

      <LookbackTabs pathname="/story-mirror" />

      {run && run.matches.length > 0 ? (
        <div className="space-y-6">
          {latestRagRun?.summary ? (
            <p className="max-w-2xl text-body-md leading-relaxed text-primary">
              {latestRagRun.summary}
            </p>
          ) : null}
          <p className="text-label-md text-text-muted">
            최근 매칭 ·{" "}
            {run.completedAt
              ? new Date(run.completedAt).toLocaleDateString("ko-KR")
              : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {run.matches.map((match) => (
              <StoryNarrativeCard
                key={match.id}
                href={`/story-mirror/${match.card.id}`}
                source={`${match.card.work.title}${match.card.work.author ? ` · ${match.card.work.author}` : ""}`}
                title={match.card.name}
                connection={
                  match.narrativeBridge ||
                  match.matchReason ||
                  parseJsonArray(match.matchThemes).slice(0, 3).join(" · ") ||
                  "이 이야기와 당신의 기록이 맞닿아 있습니다."
                }
                differentPerspective={
                  parseJsonArray(match.matchThemes)[0]
                    ? `이 인물 안에서 반복되는 주제는 ‘${parseJsonArray(match.matchThemes)[0]}’입니다.`
                    : null
                }
                compact
              />
            ))}
          </div>
        </div>
      ) : ragMatches.length === 0 &&
        reviewMirror &&
        reviewMirror.storyConnections.length > 0 ? (
        <div className="space-y-4">
          <p className="text-label-md text-text-muted">
            회고에서 닿은 이야기 ·{" "}
            {new Date(reviewMirror.periodStart).toLocaleDateString("ko-KR")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviewMirror.storyConnections.map((sc, i) => (
              <StoryNarrativeCard
                key={i}
                source={sc.source}
                title={sc.story}
                connection={sc.connection}
                differentPerspective={sc.differentPerspective}
                compact
              />
            ))}
          </div>
          <div className="flex justify-center pt-2">
            <Link href="/story-mirror/visualize" className="cta-secondary">
              이 흐름을 이미지로 기억하기
            </Link>
          </div>
        </div>
      ) : ragMatches.length > 0 ? (
        <div className="space-y-4">
          {latestRagRun?.summary ? (
            <p className="max-w-2xl text-body-md leading-relaxed text-primary">
              {latestRagRun.summary}
            </p>
          ) : (
            <p className="text-label-md text-text-muted">
              회고에서 닿은 이야기
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ragMatches.map((m) => (
              <StoryNarrativeCard
                key={m.id}
                href={`/story-mirror/${m.chunkId}`}
                source={`${m.chunk.work.title}${m.chunk.locator ? ` · ${m.chunk.locator}` : ""}`}
                title={m.chunk.title || "이야기"}
                connection={m.connection || ""}
                differentPerspective={m.differentPerspective}
                compact
              />
            ))}
          </div>
          <div className="flex justify-center pt-2">
            <Link href="/story-mirror/visualize" className="cta-secondary">
              이 흐름을 이미지로 기억하기
            </Link>
          </div>
        </div>
      ) : (
        <EmptyState
          title={hasReview ? "아직 닿은 이야기가 없어요" : "회고가 아직 없어요"}
          description={
            hasReview
              ? "회고를 다시 만들면, 당신의 기록과 닮은 마음이 살았던 인물들이 나타납니다."
              : "회고를 남기시면, 비슷한 열망과 외로움을 살았던 고전·성경의 인물과 연결해 드립니다."
          }
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/reviews" className="cta-primary">
                {hasReview ? "회고 보기" : "회고 생성하기"}
              </Link>
              <Link href="/story-mirror/visualize" className="cta-secondary">
                이미지로 기억하기
              </Link>
            </div>
          }
        />
      )}
    </AppShell>
  );
}

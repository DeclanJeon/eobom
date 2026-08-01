/**
 * /story-mirror — 돌아보기 · 이야기
 *
 * 회고에서 닿은 인물/이야기를 "입체 서사"로 보여 준다.
 * 데이터 우선순위: 최신 회고 storyConnections → RAG → card match
 *
 * 이미지 우선, 텍스트 후행: 상징적 이미지를 먼저 보여주고, 한 문장 요약을 제공한 뒤,
 * 상세 설명은 접힘 영역으로 이동하여 사용자 피로를 줄인다.
 */

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Breadcrumb, EmptyState, PageIntro } from "@/components/ui-blocks";
import { StoryNarrativeCard } from "@/components/story-narrative-card";
import { StoryVisual } from "@/components/StoryVisual";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import {
  getLatestReviewStoryMirror,
  getReviewScopedStoryItems,
} from "@/lib/story-mirror/db";

export const metadata = { title: "돌아보기 · 이야기" };

export default async function StoryMirrorPage() {
  const user = await requireUser();
  const reviewMirror = await getLatestReviewStoryMirror(user.id);
  const stories = await getReviewScopedStoryItems({
    userId: user.id,
    storyConnections: reviewMirror?.storyConnections,
  });
  const hasReview =
    (await db.reviewReport.count({
      where: { userId: user.id, deletedAt: null },
    })) > 0;

  return (
    <AppShell wide bare>
      <section className="mb-8 max-w-2xl md:mb-10">
        <PageIntro
          className="mb-0"
          eyebrow="이야기 거울"
          title={
            <>
              당신의 기록과 닮은 마음이
              <span className="mt-1 block">이미 살았던 사람들이 있습니다</span>
            </>
          }
          description="회고 속 열망·외로움·자존심·회귀는 당신만의 것이 아닙니다. 고전·성경의 인물들이 비슷한 마음을 안고 살았고, 그 겹침을 통해 자신의 서사가 더 입체적으로 다가오도록 돕습니다."
        />
      </section>

      <Breadcrumb
        href="/lookback"
        label="돌아보기"
        current="이야기"
        ariaLabel="돌아보기 이동"
        className="mb-6"
      />

      {stories.length > 0 ? (
        <div className="space-y-4">
          <p className="text-label-md text-text-muted">
            {reviewMirror
              ? `회고에서 닿은 이야기 · ${new Date(
                  reviewMirror.periodStart,
                ).toLocaleDateString("ko-KR")}`
              : "최근 닿은 이야기"}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <div key={story.key} className="space-y-3">
                {story.visualStoryId ? (
                  <StoryVisual
                    storyId={story.visualStoryId}
                    story={story.title}
                    source={story.source ?? undefined}
                    connection={story.connection}
                    differentPerspective={story.differentPerspective ?? undefined}
                    alt={`${story.title} 이야기 시각화`}
                    className="w-full h-48"
                  />
                ) : null}
                <StoryNarrativeCard
                  href={story.href}
                  source={story.source}
                  title={story.title}
                  connection={story.connection}
                  differentPerspective={story.differentPerspective}
                  compact
                />
              </div>
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
              <Link href="/lookback" className="cta-primary">
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

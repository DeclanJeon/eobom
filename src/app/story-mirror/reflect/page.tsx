/**
 * /story-mirror/reflect — 이야기 거울 연결(신규 RAG 스트리밍)
 *
 * 사용자의 회고를 바탕으로 FTS5 로컬 검색 + MiMo 스트리밍으로
 * 고전·성경 속 이야기와 연결한다. 동의가 없으면 안내만 노출한다.
 */

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { StoryMirrorRag } from "@/components/story-mirror-rag";
import { getLatestRagRun, getLatestReviewStoryMirror } from "@/lib/story-mirror/db";

export const metadata = { title: "이야기 거울 · 연결" };

export default async function StoryMirrorReflectPage() {
  const session = await requireUser();
  const user = await db.user.findUnique({ where: { id: session.id } });
  const consented = Boolean(
    user?.storyMirrorEnabled && user?.storyMirrorExternalConsent
  );

  const latestRun = await getLatestRagRun(session.id);
  const initialRun = latestRun
    ? {
        id: latestRun.id,
        createdAt: latestRun.createdAt.toISOString(),
        summary: latestRun.summary ?? "",
        connections: latestRun.matches.map((m) => ({
          chunkId: m.chunkId,
          title: m.chunk.title,
          workTitle: m.chunk.work.title,
          locator: m.chunk.locator,
        connection: m.connection ?? "",
          differentPerspective: m.differentPerspective,
        })),
      }
    : null;

  const reviewMirror = await getLatestReviewStoryMirror(session.id);
  const seedInput = reviewMirror?.seed ?? null;
  const seedLabel = reviewMirror
    ? `${new Date(reviewMirror.periodStart).toLocaleDateString("ko-KR")} 회고`
    : null;
  const storyConnections = reviewMirror?.storyConnections ?? null;

  return (
    <AppShell wide bare>
      <section className="mb-8 max-w-2xl md:mb-10">
        <p className="text-eyebrow text-accent-gold-ink">이야기 거울</p>
        <h1 className="mt-2 text-display-lg text-primary md:text-4xl">
          당신의 이야기가 닿는 곳
        </h1>
        <p className="mt-3 text-body-md text-text-muted">
          회고 속 마음을 담아 닮은 이야기를 찾아요. 수천 년 전 사람들의 이야기 속에서,
          지금의 당신과 닮은 연결을 조용히 건네드립니다.
        </p>
      </section>

      <div className="mb-6 flex gap-3">
        <Link
          href="/story-mirror"
          className="text-label-md text-text-muted hover:text-primary pb-1"
        >
          이야기
        </Link>
        <Link
          href="/story-mirror/reflect"
          className="text-label-md text-primary border-b-2 border-primary pb-1"
        >
          연결
        </Link>
        <Link
          href="/story-mirror/visualize"
          className="text-label-md text-text-muted hover:text-primary pb-1"
        >
          시각화
        </Link>
      </div>

      <div className="max-w-2xl">
      <StoryMirrorRag
        consented={consented}
        initialRun={initialRun}
        seedInput={seedInput}
        seedLabel={seedLabel}
        storyConnections={storyConnections}
      />
      </div>
    </AppShell>
  );
}

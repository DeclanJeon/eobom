import Link from "next/link";
import { SurfaceCard } from "@/components/ui-blocks";
import type { StructuredReview } from "@/lib/mimo";

type StoryMatch = {
  id: string;
  card: { id: string; name: string; work: { title: string } };
};

type RagMatch = {
  chunk: {
    title: string | null;
    work: { title: string | null };
    locator?: string | null;
  };
  connection?: string | null;
  differentPerspective?: string | null;
};

export function StoryMirrorBridge({
  latestRun,
  latestRagRun,
  storyConnections,
}: {
  latestRun?: {
    matches: StoryMatch[];
  } | null;
  latestRagRun?: {
    summary?: string | null;
    matches: RagMatch[];
  } | null;
  storyConnections?: StructuredReview["storyConnections"];
}) {
  const storyMatches = latestRun?.matches?.slice(0, 2) ?? [];
  const ragSummary = latestRagRun?.summary ?? null;
  const ragConnection = latestRagRun?.matches?.[0] ?? null;
  const hasAny =
    storyMatches.length > 0 || Boolean(ragSummary) || Boolean(ragConnection);

  if (!hasAny) {
    return (
      <section className="space-y-3">
        <h2 className="text-headline-sm text-primary">이야기 거울</h2>
        <SurfaceCard className="border-l-4 border-l-accent-gold/50">
          <p className="text-body-md text-text-muted">
            아직 연결된 이야기가 없어요. 기록이 쌓이면 지금의 마음과 닮은 인물과
            작품을 찾아드릴게요.
          </p>
          <Link
            href="/story-mirror/reflect"
            className="mt-3 inline-flex items-center gap-1 text-label-md text-leaf hover:text-primary"
          >
            이야기 거울 열기 →
          </Link>
        </SurfaceCard>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-headline-sm text-primary">이야기 거울</h2>
      <p className="text-body-md text-text-muted">
        지금의 기록과 닿아 있는 세 가지 방식
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        <SurfaceCard className="border-l-4 border-l-accent-gold/50">
          <p className="text-label-sm text-text-muted">이야기 · 닮은 인물과 비유</p>
          {storyMatches.length ? (
            <div className="mt-2 space-y-2">
              {storyMatches.map((m) => (
                <Link
                  key={m.id}
                  href={`/story-mirror/${m.card.id}`}
                  className="block"
                >
                  <p className="text-label-md text-primary">{m.card.name}</p>
                  <p className="text-label-sm text-text-muted">
                    {m.card.work.title}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-label-md text-text-muted">
              아직 매칭된 이야기가 없어요.
            </p>
          )}
          {storyConnections?.length ? (
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              {storyConnections.map((sc, idx) => (
                <div key={idx}>
                  <p className="text-label-md text-primary">{sc.story}</p>
                  <p className="text-label-sm text-text-muted">{sc.connection}</p>
                  {sc.differentPerspective ? (
                    <p className="mt-1 text-label-sm text-text-muted">
                      다른 관점: {sc.differentPerspective}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          <Link
            href="/story-mirror"
            className="mt-3 inline-flex items-center gap-1 text-label-sm text-leaf hover:text-primary"
          >
            이야기 거울 전체 →
          </Link>
        </SurfaceCard>

        <SurfaceCard className="border-l-4 border-l-leaf/50">
          <p className="text-label-sm text-text-muted">연결 · 지금의 나를 비추는 거울</p>
          {ragSummary || ragConnection ? (
            <div className="mt-2 space-y-1">
              {ragConnection ? (
                <p className="text-label-sm text-text-muted">
                  {ragConnection.chunk.work.title ?? ""}
                  {ragConnection.chunk.locator
                    ? ` · ${ragConnection.chunk.locator}`
                    : ""}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-label-md text-text-muted">
              아직 연결된 이야기가 없어요.
            </p>
          )}
          <Link
            href="/story-mirror/reflect"
            className="mt-3 inline-flex items-center gap-1 text-label-sm text-leaf hover:text-primary"
          >
            연결 시작하기 →
          </Link>
        </SurfaceCard>

        <SurfaceCard className="border-l-4 border-l-accent-terracotta/50">
          <p className="text-label-sm text-text-muted">시각화 · 한눈에 바라본 이미지</p>
          <p className="mt-2 text-label-md text-text-muted">
            기록의 흐름을 이미지로 되돌아보세요.
          </p>
          <Link
            href="/story-mirror/visualize"
            className="mt-3 inline-flex items-center gap-1 text-label-sm text-leaf hover:text-primary"
          >
            시각화 보기 →
          </Link>
        </SurfaceCard>
      </div>
    </section>
  );
}

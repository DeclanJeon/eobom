import Link from "next/link";
import { SurfaceCard } from "@/components/ui-blocks";
import type { StructuredReview } from "@/lib/mimo";

type StoryMatch = {
  id: string;
  card: { id: string; name: string; work: { title: string } };
};

export function StoryMirrorBridge({
  latestRun,
  storyConnections,
}: {
  latestRun?: {
    matches: StoryMatch[];
  } | null;
  latestRagRun?: unknown;
  storyConnections?: StructuredReview["storyConnections"];
}) {
  const storyMatches = latestRun?.matches?.slice(0, 2) ?? [];
  const hasAny =
    storyMatches.length > 0 ||
    Boolean(storyConnections && storyConnections.length > 0);

  if (!hasAny) {
    return (
      <section className="space-y-3">
        <h2 className="text-headline-sm text-primary">이야기 거울</h2>
        <SurfaceCard className="border-l-4 border-l-accent-gold/50">
          <p className="text-body-md text-text-muted">
            아직 닿은 이야기가 없어요. 회고를 바탕으로 고전 속 닮은 인물과
            작품을 찾아보세요.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/story-mirror"
              className="inline-flex items-center gap-1 text-label-md text-leaf hover:text-primary"
            >
              이야기 보기 →
            </Link>
            <Link
              href="/story-mirror/visualize"
              className="inline-flex items-center gap-1 text-label-md text-leaf hover:text-primary"
            >
              시각화 보기 →
            </Link>
          </div>
        </SurfaceCard>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-headline-sm text-primary">이야기 거울</h2>
      <p className="text-body-md text-text-muted">
        지금의 기록을 이야기와 이미지로 다시 바라봅니다
      </p>
      <div className="grid gap-3 md:grid-cols-2">
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
          ) : storyConnections?.length ? (
            <div className="mt-2 space-y-2">
              {storyConnections.slice(0, 2).map((sc, idx) => (
                <div key={idx}>
                  <p className="text-label-md text-primary">{sc.story}</p>
                  <p className="text-label-sm text-text-muted">{sc.connection}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-label-md text-text-muted">
              아직 매칭된 이야기가 없어요.
            </p>
          )}
          <Link
            href="/story-mirror"
            className="mt-3 inline-flex items-center gap-1 text-label-sm text-leaf hover:text-primary"
          >
            이야기 거울 전체 →
          </Link>
        </SurfaceCard>

        <SurfaceCard className="border-l-4 border-l-accent-terracotta/50">
          <p className="text-label-sm text-text-muted">시각화 · 한눈에 바라본 이미지</p>
          <p className="mt-2 text-label-md text-text-muted">
            회고 내용을 AI가 읽고, 그 흐름을 이미지와 해설로 보여 줍니다.
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

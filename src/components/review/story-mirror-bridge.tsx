import Link from "next/link";
import { SurfaceCard } from "@/components/ui-blocks";
import { StoryNarrativeCard } from "@/components/story-narrative-card";
import type { StoryMirrorItem } from "@/lib/story-mirror/story-links";

/**
 * 회고 문서 안의 이야기 거울.
 * 전역 latest run이 아니라, 이 회고 기준으로 준비된 이야기 목록을 보여 준다.
 */
export function StoryMirrorBridge({
  stories,
}: {
  stories: StoryMirrorItem[];
}) {
  if (stories.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-headline-sm text-primary">이야기 거울</h2>
        <SurfaceCard className="border-l-4 border-l-accent-gold/50">
          <p className="text-body-md text-text-muted">
            아직 이 회고와 닿은 이야기가 없어요. 돌아보기에서 고전·성경 속 닮은
            마음을 찾아볼 수 있습니다.
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
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-headline-sm text-primary">이야기 거울</h2>
          <p className="mt-1 text-body-md text-text-muted">
            이 회고의 기록과 맞닿은 고전·성경 속 이야기입니다.
          </p>
        </div>
        <Link
          href="/story-mirror"
          className="text-label-sm text-leaf hover:text-primary"
        >
          이야기 전체 →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {stories.slice(0, 3).map((story) => (
          <StoryNarrativeCard
            key={story.key}
            source={story.source}
            title={story.title}
            connection={story.connection}
            differentPerspective={story.differentPerspective}
            href={story.href}
            compact
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        <Link
          href="/story-mirror/visualize"
          className="inline-flex items-center gap-1 text-label-sm text-leaf hover:text-primary"
        >
          이 흐름을 이미지로 기억하기 →
        </Link>
      </div>
    </section>
  );
}

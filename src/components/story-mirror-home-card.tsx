/**
 * Story Mirror — Home Card
 *
 * 오늘 홈 하단에 표시되는 이야기 거울 요약 카드.
 * 서버 컴포넌트. 매칭을 자동 생성하지 않고 기존 결과만 표시한다.
 */

import Link from "next/link";
import { getLatestRun, getLatestRagRun } from "@/lib/story-mirror/db";
import { parseJsonArray } from "@/lib/utils";

export async function StoryMirrorHomeCard({ userId, storyMirrorEnabled }: { userId: string; storyMirrorEnabled: boolean }) {
  if (!storyMirrorEnabled) return null;
  const run = await getLatestRun(userId);
  const latestRagRun = await getLatestRagRun(userId);
  if (!run || run.matches.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-eyebrow text-accent-gold-ink">이야기 거울</p>
          <h2 className="mt-1 text-headline-sm text-primary">
            당신의 기록이 닮은 이야기들
          </h2>
        </div>
        <Link
          href="/story-mirror"
          className="text-label-sm text-leaf transition hover:text-primary"
        >
          더 보기 →
        </Link>
        {latestRagRun && (
          <Link
            href="/story-mirror/reflect"
            className="text-label-sm text-leaf transition hover:text-primary"
          >
            거울 연결 →
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {run.matches.slice(0, 2).map((match) => {
          const warnings = parseJsonArray(match.card.contentWarnings);
          return (
            <Link
              key={match.id}
              href={`/story-mirror/${match.card.id}`}
              className="group block rounded-2xl border border-line bg-white/95 p-4 transition hover:border-accent-gold/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-label-sm text-text-muted">
                    {match.card.work.title}
                  </p>
                  <h3 className="mt-0.5 text-headline-sm text-primary">
                    {match.card.name}
                  </h3>
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
            </Link>
          );
        })}
      </div>
    </section>
  );
}

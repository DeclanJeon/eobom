/**
 * /story-mirror/visualize — 이야기 거울 시각화 페이지
 *
 * 사용자의 기록을 시각적으로 연결한다.
 */

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { VisualizationCard } from "@/components/visualization-card";

export const metadata = { title: "시각화 · 이야기 거울" };

export default async function VisualizePage() {
  const user = await requireUser();

  const entryCount = await db.reflectionEntry.count({
    where: { userId: user.id, deletedAt: null },
  });

  const vis = await db.userVisualization.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const visByKind = new Map<string, typeof vis[0]>();
  for (const v of vis) {
    if (!visByKind.has(v.kind)) visByKind.set(v.kind, v);
  }

  const kinds = ["summary"] as const;

  return (
    <AppShell wide bare>
      <div className="mb-6 flex gap-3">
        <Link href="/story-mirror" className="text-label-md text-text-muted hover:text-primary pb-1">
          이야기
        </Link>
        <Link href="/story-mirror/visualize" className="text-label-md text-primary border-b-2 border-primary pb-1">
          시각화
        </Link>
      </div>

      <section className="mb-8 max-w-2xl">
        <h1 className="text-display-lg text-primary">나의 기록을 시각적으로</h1>
        <p className="mt-3 text-body-md text-text-muted">
          묵상 기록에서 주제·감정·시간의 흐름을 시각적으로 연결하여, 자기 자신의 서사를 입체적으로 이해하도록 돕습니다.
        </p>
      </section>

      {entryCount < 3 ? (
        <EmptyState
          title="시각화할 기록이 부족합니다"
          description="기록이 3개 이상 쌓이면 시각화를 시작할 수 있습니다."
          action={
            <Link href="/entries/new" className="cta-primary">
              기록하기
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {kinds.map((kind) => (
            <VisualizationCard key={kind} kind={kind} initial={visByKind.get(kind)} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

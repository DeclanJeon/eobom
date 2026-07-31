/**
 * /story-mirror/visualize — 돌아보기 · 시각화
 */

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LookbackTabs } from "@/components/lookback-tabs";
import { EmptyState } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { VisualizationCard } from "@/components/visualization-card";

export const metadata = { title: "돌아보기 · 시각화" };

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

  const visByKind = new Map<string, (typeof vis)[0]>();
  for (const v of vis) {
    if (!visByKind.has(v.kind)) visByKind.set(v.kind, v);
  }

  const kinds = ["summary"] as const;

  return (
    <AppShell wide bare>
      <LookbackTabs pathname="/story-mirror/visualize" />

      <section className="mb-8 max-w-2xl">
        <h1 className="text-display-lg text-primary">나의 기록을 시각적으로</h1>
        <p className="mt-3 text-body-md text-text-muted">
          AI가 당신의 회고와 묵상 기록을 읽고, 그 흐름을 하나의 이미지와 해설로
          보여 줍니다. 하드코딩된 그림이 아니라, 이번 계절의 기록에서 나온
          장면입니다.
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
            <VisualizationCard
              key={kind}
              kind={kind}
              initial={visByKind.get(kind)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}

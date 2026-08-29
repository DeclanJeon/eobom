/**
 * /story-mirror/visualize — 돌아보기 · 시각화
 */

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Breadcrumb, EmptyState } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { VisualizationCard } from "@/components/visualization-card";
import {
  computeVisualizationFingerprint,
  deriveVisualizationFreshness,
  getStoredFingerprint,
  hasSynthesisInDataJson,
} from "@/lib/story-mirror/visualization-fingerprint";

export const metadata = { title: "돌아보기 · 시각화" };
export const dynamic = "force-dynamic";

export default async function VisualizePage() {
  const user = await requireUser();

  const entryCount = await db.reflectionEntry.count({
    where: { userId: user.id, deletedAt: null },
  });

  const currentFingerprint =
    entryCount >= 3
      ? await computeVisualizationFingerprint(user.id, { kind: "summary" })
      : "";

  const vis = await db.userVisualization.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const visByKind = new Map<
    string,
    (typeof vis)[0] & {
      freshness: ReturnType<typeof deriveVisualizationFreshness>;
    }
  >();
  for (const v of vis) {
    if (visByKind.has(v.kind)) continue;
    const storedFingerprint = getStoredFingerprint(v.dataJson);
    const freshness = deriveVisualizationFreshness({
      hasImage: Boolean(v.imageUrl),
      hasSynthesis: hasSynthesisInDataJson(v.dataJson),
      storedFingerprint,
      currentFingerprint:
        v.kind === "summary" ? currentFingerprint : storedFingerprint ?? "",
    });
    visByKind.set(v.kind, { ...v, freshness });
  }

  const kinds = ["summary"] as const;

  return (
    <AppShell wide bare>
      <Breadcrumb
        href="/lookback"
        label="돌아보기"
        current="시각화"
        ariaLabel="돌아보기 이동"
        className="mb-6"
      />

      <section className="mb-8 max-w-2xl">
        <h1 className="text-display-lg text-primary">나의 기록을 시각적으로</h1>
        <p className="mt-3 text-body-md text-text-muted">
          AI가 당신의 회고와 묵상 기록을 읽고, 그 흐름을 하나의 이미지와 해설로
          보여 줍니다. 기록이 달라지면 장면이 옛것이 되고, 다시 그리면 지금
          흐름을 반영합니다.
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
          {kinds.map((kind) => {
            const row = visByKind.get(kind);
            return (
              <VisualizationCard
                key={kind}
                kind={kind}
                initial={
                  row
                    ? {
                        id: row.id,
                        kind: row.kind,
                        status: row.status,
                        imageUrl: row.imageUrl,
                        dataJson: row.dataJson,
                        freshness: row.freshness,
                      }
                    : undefined
                }
                initialFreshness={row?.freshness ?? "none"}
              />
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

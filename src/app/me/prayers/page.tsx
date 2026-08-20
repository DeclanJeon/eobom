import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, PageIntro, SoftBadge, SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { excerpt } from "@/lib/utils";

export const metadata = { title: "기도 제목" };

const STATUS_LABEL: Record<string, string> = {
  continuing: "계속 기도 중",
  answered: "응답됨",
  paused: "잠시 멈춤",
};

const TABS = [
  { key: "continuing", label: "계속 기도 중" },
  { key: "answered", label: "응답됨" },
  { key: "paused", label: "잠시 멈춤" },
] as const;

type SearchParams = { status?: string };

export default async function PrayersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { status } = await searchParams;
  const validStatuses = ["continuing", "answered", "paused"] as const;
  const filterStatus = validStatuses.includes(status as never) ? (status as typeof validStatuses[number]) : undefined;

  const topics = await db.prayerTopic.findMany({
    where: filterStatus ? { userId: user.id, status: filterStatus } : { userId: user.id },
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  return (
    <AppShell wide bare>
      <PageIntro eyebrow="기도" title="기도 제목" description="묵상 기록에 남긴 기도가 여기에 모입니다." />

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/me/prayers"
          className={!filterStatus ? "chip-gold" : "chip"}
        >
          전체
        </Link>
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/me/prayers?status=${tab.key}`}
            className={filterStatus === tab.key ? "chip-gold" : "chip"}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {topics.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="아직 기도 제목이 없습니다 — 묵상 기록에 기도를 남기면 여기에 모입니다."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {topics.map((topic) => (
            <SurfaceCard key={topic.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-label-md text-primary">{topic.title}</h2>
                <SoftBadge>{STATUS_LABEL[topic.status] ?? topic.status}</SoftBadge>
              </div>
              {topic.body ? (
                <p className="text-body-sm text-text-muted">{excerpt(topic.body, 120)}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                {topic.sourceEntryId ? (
                  <Link
                    href={`/entries/${topic.sourceEntryId}`}
                    className="text-label-sm text-leaf underline-offset-4 hover:underline"
                  >
                    원문 보기
                  </Link>
                ) : null}
                {topic.status === "continuing" ? (
                  <form method="POST" action={`/api/prayers/${topic.id}/status`} className="inline">
                    <input type="hidden" name="status" value="answered" />
                    <button type="submit" className="cta-primary min-h-9 px-3 text-label-sm">
                      응답됨으로 표시
                    </button>
                  </form>
                ) : null}
                {topic.status !== "continuing" ? (
                  <form method="POST" action={`/api/prayers/${topic.id}/status`} className="inline">
                    <input type="hidden" name="status" value="continuing" />
                    <button type="submit" className="chip min-h-9 px-3 text-label-sm">
                      계속 기도 중으로
                    </button>
                  </form>
                ) : null}
              </div>
            </SurfaceCard>
          ))}
        </div>
      )}
    </AppShell>
  );
}

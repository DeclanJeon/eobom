import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SoftBadge, SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/utils";
import type { StructuredReview } from "@/lib/mimo";

export const metadata = { title: "회고 상세" };

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const report = await db.reviewReport.findFirst({
    where: { id, userId: user.id, deletedAt: null },
  });
  if (!report) notFound();

  const review = JSON.parse(report.structuredOutput) as StructuredReview;

  return (
    <AppShell title="회고">
      <div className="space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <SoftBadge>{report.reportType}</SoftBadge>
            <span className="text-label-sm text-text-muted">
              {formatDateShort(report.periodStart)} –{" "}
              {formatDateShort(report.periodEnd)}
            </span>
          </div>
          <h1 className="mt-3 text-display-lg text-primary">
            {review.oneSentence || report.summary}
          </h1>
          <p className="mt-3 rounded-2xl bg-surface-low px-4 py-3 text-label-md leading-relaxed text-text-muted">
            {review.disclaimer}
          </p>
        </div>

        <ObservationSection title="자주 나타난 주제" items={review.themes} />
        <ObservationSection title="반복해서 드러난 마음" items={review.emotions} />
        <ObservationSection title="붙잡고 있던 질문" items={review.questions} />
        <ObservationSection
          title="말씀과 삶의 연결"
          items={review.scriptureConnections}
        />
        <ObservationSection title="이전 결단의 흐름" items={review.actionFlow} />

        <SurfaceCard>
          <h2 className="text-headline-sm text-primary">
            달라진 점 또는 아직 알 수 없는 점
          </h2>
          <p className="mt-2 text-body-md text-text-muted">
            {review.changesOrUnknown}
          </p>
        </SurfaceCard>

        {review.rereadEntries?.length ? (
          <SurfaceCard>
            <h2 className="text-headline-sm text-primary">다시 읽어볼 기록</h2>
            <ul className="mt-3 space-y-2">
              {review.rereadEntries.map((item) => (
                <li key={item.entryId}>
                  <Link
                    href={`/entries/${item.entryId}`}
                    className="text-label-md text-primary"
                  >
                    기록 열기
                  </Link>
                  <p className="text-label-md text-text-muted">{item.reason}</p>
                </li>
              ))}
            </ul>
          </SurfaceCard>
        ) : null}

        {review.smallPractices?.length ? (
          <SurfaceCard>
            <h2 className="text-headline-sm text-primary">작은 실천 후보</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-body-md text-text-muted">
              {review.smallPractices.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SurfaceCard>
        ) : null}

        <SurfaceCard>
          <h2 className="text-headline-sm text-primary">분석의 한계</h2>
          <p className="mt-2 text-body-md text-text-muted">{review.limitations}</p>
          <p className="mt-3 text-label-sm text-text-muted">
            model: {report.modelProvider}/{report.modelName}
          </p>
        </SurfaceCard>
      </div>
    </AppShell>
  );
}

function ObservationSection({
  title,
  items,
}: {
  title: string;
  items?: Array<{
    key: string;
    title: string;
    body: string;
    confidence?: string;
    evidence?: Array<{ entryId: string; date?: string; excerpt: string }>;
  }>;
}) {
  if (!items?.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-headline-sm text-primary">{title}</h2>
      {items.map((item) => (
        <SurfaceCard key={item.key} className="border-l-4 border-l-accent-gold/50">
          <div className="flex items-center gap-2">
            <h3 className="text-label-md text-primary">{item.title}</h3>
            {item.confidence ? <SoftBadge>{item.confidence}</SoftBadge> : null}
          </div>
          <p className="mt-2 text-body-md text-text-muted">{item.body}</p>
          {item.evidence?.length ? (
            <div className="mt-3 space-y-2 border-t border-[#E0DDD7] pt-3">
              {item.evidence.map((ev, idx) => (
                <div key={`${item.key}-${idx}`} className="text-label-sm text-text-muted">
                  <Link href={`/entries/${ev.entryId}`} className="text-primary">
                    근거 기록
                  </Link>
                  {ev.date ? <span> · {ev.date.slice(0, 10)}</span> : null}
                  <p className="mt-1 text-text-main">“{ev.excerpt}”</p>
                </div>
              ))}
            </div>
          ) : null}
        </SurfaceCard>
      ))}
    </section>
  );
}

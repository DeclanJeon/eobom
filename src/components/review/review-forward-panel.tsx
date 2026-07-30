import Link from "next/link";
import { SurfaceCard } from "@/components/ui-blocks";
import type { StructuredReview } from "@/lib/mimo";

export function ReviewForwardPanel({
  nextSteps,
  prayerPrompts,
  smallPractices,
}: {
  nextSteps: StructuredReview["nextSteps"];
  prayerPrompts: StructuredReview["prayerPrompts"];
  smallPractices: string[];
}) {
  const hasNext = nextSteps.length > 0;
  const hasPrayer = prayerPrompts.length > 0;
  if (!hasNext && !hasPrayer) return null;

  return (
    <div className="space-y-3">
      {hasNext ? (
        <SurfaceCard className="border-l-4 border-l-leaf">
          <h2 className="text-headline-sm text-primary">다음 한 걸음</h2>
          <div className="mt-3 space-y-3">
            {nextSteps.map((ns, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="mt-0.5 text-lg text-leaf">{idx + 1}</span>
                <div>
                  <p className="text-label-md text-primary">{ns.action}</p>
                  {ns.reason ? (
                    <p className="mt-1 text-label-sm text-text-muted">
                      {ns.reason}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/entries/new"
            className="mt-4 inline-flex items-center gap-1 text-label-md text-leaf hover:text-primary"
          >
            이 한 걸음을 기록으로 남기기 →
          </Link>
        </SurfaceCard>
      ) : smallPractices.length ? (
        <SurfaceCard className="border-l-4 border-l-leaf">
          <h2 className="text-headline-sm text-primary">작은 실천 후보</h2>
          <ul className="mt-3 space-y-2 text-body-md text-text-muted">
            {smallPractices.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="mt-0.5 text-leaf">{idx + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </SurfaceCard>
      ) : null}

      {hasPrayer ? (
        <SurfaceCard className="border-l-4 border-l-accent-terracotta">
          <h2 className="text-headline-sm text-primary">기도로 이어가기</h2>
          <div className="mt-3 space-y-3">
            {prayerPrompts.map((pp, idx) => (
              <div key={idx}>
                <p className="text-label-md text-primary">{pp.topic}</p>
                {pp.suggestion ? (
                  <p className="mt-1 text-body-md text-text-muted">
                    {pp.suggestion}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </SurfaceCard>
      ) : null}
    </div>
  );
}

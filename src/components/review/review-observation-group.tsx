import Link from "next/link";
import { SurfaceCard, SoftBadge } from "@/components/ui-blocks";
import { ObservationFeedback } from "@/components/observation-feedback";
import type { DisplayObservation } from "@/lib/review-display";

export function ReviewObservationGroup({
  title,
  items,
  reviewId,
  feedback,
}: {
  title: string;
  items: DisplayObservation[];
  reviewId?: string;
  feedback?: Record<string, unknown>;
}) {
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-headline-sm text-primary">{title}</h2>
      {items.map((item) => (
        <SurfaceCard
          key={item.key}
          className="border-l-4 border-l-accent-gold/50"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-label-md text-primary">{item.title}</h3>
            {item.confidenceLabel ? (
              <SoftBadge>{item.confidenceLabel}</SoftBadge>
            ) : null}
          </div>
          {item.body ? (
            <p className="mt-2 text-body-md text-text-muted">{item.body}</p>
          ) : null}
          {item.evidence.length ? (
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              {item.evidence.map((ev, idx) => (
                <div key={idx} className="text-label-sm text-text-muted">
                  <Link
                    href={`/entries/${ev.entryId}`}
                    className="text-primary hover:underline"
                  >
                    {ev.date ? `${ev.date.slice(0, 10)} 기록 열기` : "기록 열기"}
                  </Link>
                  {ev.excerpt ? (
                    <p className="mt-1 text-text-main">“{ev.excerpt}”</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {reviewId ? (
            <div className="mt-3">
              <ObservationFeedback
                reviewId={reviewId}
                observationKey={item.key}
                initialFeedback={
                  (feedback?.[`_feedback_${item.key}`] as string[]) ?? []
                }
              />
            </div>
          ) : null}
        </SurfaceCard>
      ))}
    </section>
  );
}

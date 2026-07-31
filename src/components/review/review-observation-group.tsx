import { SurfaceCard, SoftBadge } from "@/components/ui-blocks";
import { ObservationFeedback } from "@/components/observation-feedback";
import { EvidenceDrawer } from "@/components/review/evidence-drawer";
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
            {item.evidence.length ? (
              <SoftBadge>기록 {item.evidence.length}개 기반</SoftBadge>
            ) : null}
          </div>
          {item.body ? (
            <p className="mt-2 text-body-md text-text-muted">{item.body}</p>
          ) : null}
          <EvidenceDrawer items={item.evidence} />
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

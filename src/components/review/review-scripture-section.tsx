import { SurfaceCard } from "@/components/ui-blocks";
import type { StructuredReview } from "@/lib/mimo";

export function ReviewScriptureSection({
  items,
}: {
  items: StructuredReview["scriptureReadings"];
}) {
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-headline-sm text-primary">다시 읽을 말씀</h2>
      {items.map((sr, idx) => (
        <SurfaceCard
          key={idx}
          className="border-l-4 border-l-accent-gold/50"
        >
          <span className="chip-gold">{sr.ref}</span>
          {sr.reason ? (
            <p className="mt-2 text-body-md text-text-muted">{sr.reason}</p>
          ) : null}
          {sr.focus ? (
            <p className="mt-1 text-label-sm text-text-muted">
              집중할 점: {sr.focus}
            </p>
          ) : null}
        </SurfaceCard>
      ))}
    </section>
  );
}

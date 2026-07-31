import Link from "next/link";
import { SurfaceCard } from "@/components/ui-blocks";
import { cn } from "@/lib/utils";

/**
 * 이야기 연결 카드 — "입체 서사" 톤으로 표시한다.
 * 베지터/부르마 식 복제가 아니라:
 * 겉으로 보이는 모습 → 그 안에 있던 것 → 나의 기록과 겹침 → 한 문장 응축
 */
export function StoryNarrativeCard({
  source,
  title,
  connection,
  differentPerspective,
  href,
  className,
  compact = false,
}: {
  source?: string | null;
  title: string;
  connection: string;
  differentPerspective?: string | null;
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  const body = (
    <SurfaceCard
      className={cn(
        "h-full border-l-4 border-l-accent-gold/50 transition",
        href && "hover:border-accent-gold/40",
        className,
      )}
    >
      <p className="text-label-xs uppercase tracking-wide text-accent-gold-ink">
        당신의 기록과 닿은 인물
      </p>
      {source ? (
        <p className="mt-1 text-label-sm text-text-muted">{source}</p>
      ) : null}
      <h2 className="mt-1 text-headline-sm text-primary">{title}</h2>

      <p
        className={cn(
          "mt-3 text-body-md leading-relaxed text-text-muted",
          compact && "line-clamp-5",
        )}
      >
        {connection}
      </p>

      {differentPerspective?.trim() ? (
        <div className="mt-4 rounded-xl bg-surface-shared/80 p-3">
          <p className="text-label-xs font-medium text-leaf">한 문장으로 보면</p>
          <p className="mt-1 text-body-sm leading-relaxed text-primary">
            {differentPerspective}
          </p>
        </div>
      ) : null}

      {href ? (
        <p className="mt-4 text-label-sm text-leaf">이야기 더 읽기 →</p>
      ) : null}
    </SurfaceCard>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {body}
      </Link>
    );
  }
  return body;
}

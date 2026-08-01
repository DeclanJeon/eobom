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
  imageUrl,
  imageAlt,
  href,
  className,
  compact = false,
}: {
  source?: string | null;
  title: string;
  connection: string;
  differentPerspective?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  const body = (
    <SurfaceCard
      className={cn(
        "h-full border-l-4 border-l-accent-gold/50 transition overflow-hidden",
        href && "hover:border-accent-gold/40",
        className,
      )}
    >
      {imageUrl && (
        <div className="-mx-5 -mt-5 mb-4">
          <img
            src={imageUrl}
            alt={imageAlt || "이야기 시각화"}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
        </div>
      )}

      <p className="text-label-xs uppercase tracking-wide text-accent-gold-ink">
        당신의 기록과 닿은 인물
      </p>
      {source ? (
        <p className="mt-1 text-label-sm text-text-muted">{source}</p>
      ) : null}
      <h2 className="mt-1 text-headline-sm text-primary">{title}</h2>

      {differentPerspective?.trim() ? (
        <p className="mt-3 text-body-md leading-relaxed text-primary font-medium">
          {differentPerspective}
        </p>
      ) : null}

      <details className="mt-4 group">
        <summary className="cursor-pointer text-label-sm text-leaf hover:text-leaf/80 transition list-none">
          <span className="group-open:hidden">이 이야기가 당신의 기록과 닿은 이유 보기 →</span>
          <span className="hidden group-open:inline">접기 ↑</span>
        </summary>
        <div className="mt-3 rounded-xl bg-surface-shared/80 p-3">
          <p className="text-body-sm leading-relaxed text-text-muted">
            {connection}
          </p>
        </div>
      </details>

      {href ? (
        <Link href={href} className="mt-4 block text-label-sm text-leaf">
          이야기 더 읽기 →
        </Link>
      ) : null}
    </SurfaceCard>
  );

  return body;
}

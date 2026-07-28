import Link from "next/link";
import { SurfaceCard } from "@/components/ui-blocks";
import { getPassageBySlug } from "@/lib/bible";

type RereadScriptureItem = {
  ref: string;
  reason: string;
  slug?: string;
  display?: string;
  startVerse?: number;
  endVerse?: number;
  openQuestion?: string;
  /** Non-AI fallback: original entry that recorded this ref */
  entryId?: string;
};

export async function RereadScriptureList({
  items,
  variant,
  title,
  subtitle,
  meta,
  reviewHref,
}: {
  items: RereadScriptureItem[];
  variant: "review" | "home";
  title: string;
  subtitle?: string;
  meta?: string;
  reviewHref?: string;
}) {
  if (!items.length) return null;

  const passages = items.map((item) =>
    item.slug ? getPassageBySlug(item.slug) : null,
  );

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-headline-sm text-primary">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-body-md text-text-muted">{subtitle}</p>
        ) : null}
        {meta ? <p className="mt-1 text-label-sm text-text-muted">{meta}</p> : null}
      </div>
      <ul className="space-y-3">
        {items.map((item, index) => {
          const passage = passages[index];
          const display = item.display || item.ref;
          return (
            <li key={item.slug || `${item.ref}-${index}`}>
              <SurfaceCard>
                <span className="chip-gold">{display}</span>
                <p
                  className={`mt-3 text-body-md text-text-muted ${
                    variant === "home" ? "line-clamp-2" : ""
                  }`}
                >
                  {item.reason}
                </p>
                {variant === "review" && item.openQuestion ? (
                  <p className="mt-3 writing-margin text-body-md text-text-main">
                    {item.openQuestion}
                  </p>
                ) : null}
                {item.startVerse === item.endVerse ? (
                  <p className="mt-3 text-label-sm text-text-muted">
                    주변 문맥과 함께 읽어 보세요.
                  </p>
                ) : null}
                {passage?.binding.excerpt ? (
                  <div className="writing-margin mt-3">
                    <p className="text-body-md leading-relaxed text-text-main">
                      {passage.binding.excerpt}
                    </p>
                    <p className="mt-2 text-label-sm text-text-muted">
                      한국어 성경 (Open Bibles) · 개역개정 아님
                    </p>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-label-md">
                  {variant === "home" && reviewHref ? (
                    <Link href={reviewHref} className="min-h-[44px] py-2 text-primary">
                      회고 보기
                    </Link>
                  ) : null}
                  {item.entryId ? (
                    <Link
                      href={`/entries/${item.entryId}`}
                      className="min-h-[44px] py-2 text-primary"
                    >
                      기록 보기
                    </Link>
                  ) : null}
                  <Link
                    href={`/entries/new?scripture=${encodeURIComponent(display)}`}
                    className="min-h-[44px] py-2 text-primary"
                  >
                    이 본문으로 기록하기
                  </Link>
                </div>
              </SurfaceCard>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

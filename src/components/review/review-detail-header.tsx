import Link from "next/link";
import { formatDateShort } from "@/lib/utils";
import { reportTypeLabel } from "@/lib/review-display";

export function ReviewDetailHeader({
  reportType,
  periodStart,
  periodEnd,
}: {
  reportType?: string | null;
  periodStart: Date | string;
  periodEnd: Date | string;
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label-sm text-text-muted">
      <Link href="/reviews" className="text-leaf transition hover:text-primary">
        ← 회고
      </Link>
      <span aria-hidden>·</span>
      <span>{reportTypeLabel(reportType)}</span>
      <span aria-hidden>·</span>
      <span>
        {formatDateShort(periodStart)} – {formatDateShort(periodEnd)}
      </span>
    </header>
  );
}

import { Breadcrumb } from "@/components/ui-blocks";
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
    <Breadcrumb
      href="/lookback"
      label="돌아보기"
      current={
        <>
          {reportTypeLabel(reportType)}
          <span aria-hidden="true">·</span>
          {formatDateShort(periodStart)} – {formatDateShort(periodEnd)}
        </>
      }
      className="text-label-md"
    />
  );
}

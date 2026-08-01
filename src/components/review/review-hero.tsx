import { formatDateShort } from "@/lib/utils";

export function ReviewHero({
  title,
  periodStart,
  periodEnd,
  entryCount,
  evidenceCount,
}: {
  title: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  entryCount?: number;
  evidenceCount?: number;
}) {
  const meta = [
    `${formatDateShort(periodStart)} – ${formatDateShort(periodEnd)}`,
    entryCount ? `기록 ${entryCount}개` : null,
    evidenceCount ? `근거 기록 ${evidenceCount}개` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="surface-card-dark rounded-2xl p-6 md:p-8">
      <p className="text-label-sm text-on-dark-muted">AI 회고 초안</p>
      <h1 className="mt-3 text-display-lg leading-tight text-white md:text-4xl">
        {title}
      </h1>
      {meta ? (
        <p className="mt-4 text-label-md text-on-dark-muted">{meta}</p>
      ) : null}
    </section>
  );
}

import Link from "next/link";
import type { DevNote } from "@/lib/dev-notes";
import { appVersionLabel } from "@/lib/version";

export function DevNotesSection({ note }: { note: DevNote | null }) {
  if (!note) return null;

  const highlights = note.highlights.slice(0, 5);

  return (
    <section
      id="updates"
      className="border-t border-border/70 py-20 md:py-28"
      aria-labelledby="updates-heading"
    >
      <div className="mx-auto max-w-3xl px-1">
        <p className="text-label-sm font-medium tracking-wide text-leaf">
          업데이트
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="updates-heading"
              className="text-headline-md text-primary md:text-headline-lg"
            >
              최근 달라진 점
            </h2>
            <p className="mt-2 text-body-md text-text-muted">
              {note.date ? `${note.date} · ` : ""}
              {appVersionLabel()} 기준으로 정리했습니다.
            </p>
          </div>
          <Link
            href="/updates"
            className="inline-flex min-h-11 items-center text-label-md text-leaf underline-offset-2 hover:underline"
          >
            전체 개발노트 →
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-white/80 p-5 shadow-sm md:p-6">
          <p className="text-label-md font-medium text-primary">{note.title}</p>
          {highlights.length ? (
            <ul className="mt-4 space-y-2.5">
              {highlights.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-body-md leading-relaxed text-text-main"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf/80" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-body-md text-text-muted">
              이번 버전 요약이 곧 올라옵니다.
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/updates/${note.slug}`}
              className="cta-secondary min-h-11 px-4 py-2 text-label-md"
            >
              이 버전 자세히
            </Link>
            <Link
              href="/suggest"
              className="inline-flex min-h-11 items-center px-2 text-label-md text-text-muted underline-offset-2 hover:text-primary hover:underline"
            >
              다음 개선 제안하기
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

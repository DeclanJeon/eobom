import type { Metadata } from "next";
import Link from "next/link";
import { listDevNotes } from "@/lib/dev-notes";
import { appVersionLabel } from "@/lib/version";
import { getOptionalUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "개발노트",
  description: "이어봄에 추가·개선된 기능을 버전별로 확인합니다.",
};

export default async function UpdatesPage() {
  const user = await getOptionalUser();
  const notes = listDevNotes();

  return (
    <div className="min-h-dvh bg-background px-5 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-10 text-center">
          <Link
            href={user ? "/today" : "/"}
            className="inline-flex min-h-11 items-center font-journal text-title-journal text-primary"
          >
            이어봄
          </Link>
          <h1 className="mt-6 text-display-lg text-primary">개발노트</h1>
          <p className="mt-3 text-body-md text-text-muted">
            현재 {appVersionLabel()} · 새로 생긴 기능과 다듬은 점을 짧게 남깁니다.
          </p>
        </div>

        {notes.length === 0 ? (
          <p className="rounded-2xl border border-border bg-white px-4 py-6 text-center text-body-md text-text-muted">
            아직 공개된 개발노트가 없습니다.
          </p>
        ) : (
          <ul className="space-y-4">
            {notes.map((note) => (
              <li key={note.slug}>
                <Link
                  href={`/updates/${note.slug}`}
                  className="block rounded-2xl border border-border bg-white px-5 py-5 transition hover:border-accent-gold/40"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-label-md font-medium text-primary">
                      {note.title}
                    </p>
                    {note.date ? (
                      <time
                        dateTime={note.date}
                        className="text-label-sm text-text-muted"
                      >
                        {note.date}
                      </time>
                    ) : null}
                  </div>
                  {note.highlights[0] ? (
                    <p className="mt-2 line-clamp-2 text-body-md text-text-muted">
                      {note.highlights[0]}
                      {note.highlights.length > 1
                        ? ` 외 ${note.highlights.length - 1}가지`
                        : ""}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-center text-label-sm text-text-muted">
          아이디어가 있으신가요?{" "}
          <Link
            href="/suggest"
            className="text-leaf underline-offset-2 hover:underline"
          >
            제안하기
          </Link>
        </p>
      </div>
    </div>
  );
}

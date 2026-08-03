import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDevNoteBySlug, listDevNotes } from "@/lib/dev-notes";
import { getOptionalUser } from "@/lib/session";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return listDevNotes().map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const note = getDevNoteBySlug(slug);
  if (!note) return { title: "개발노트" };
  return {
    title: `${note.title} · 개발노트`,
    description: note.highlights[0] || "이어봄 업데이트 내용",
  };
}

export default async function UpdateDetailPage({ params }: Props) {
  const { slug } = await params;
  const note = getDevNoteBySlug(slug);
  if (!note) notFound();
  const user = await getOptionalUser();

  return (
    <div className="min-h-dvh bg-background px-5 py-10">
      <article className="mx-auto w-full max-w-2xl">
        <div className="mb-8">
          <Link
            href="/updates"
            className="inline-flex min-h-11 items-center text-label-md text-text-muted underline-offset-2 hover:text-primary hover:underline"
          >
            ← 개발노트
          </Link>
          <h1 className="mt-4 text-display-lg text-primary">{note.title}</h1>
          {note.date ? (
            <p className="mt-2 text-label-md text-text-muted">
              <time dateTime={note.date}>{note.date}</time>
            </p>
          ) : null}
        </div>

        <div className="space-y-8">
          {note.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-headline-sm text-primary">{section.title}</h2>
              <ul className="mt-3 space-y-2">
                {section.items.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-body-md leading-relaxed text-text-main"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf/80"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-4 border-t border-border pt-6 text-label-md">
          <Link
            href={user ? "/today" : "/"}
            className="text-leaf underline-offset-2 hover:underline"
          >
            {user ? "오늘로" : "홈으로"}
          </Link>
          <Link
            href="/suggest"
            className="text-text-muted underline-offset-2 hover:text-primary hover:underline"
          >
            제안하기
          </Link>
        </div>
      </article>
    </div>
  );
}

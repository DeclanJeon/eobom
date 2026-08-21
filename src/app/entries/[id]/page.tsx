import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Breadcrumb, SoftBadge, SurfaceCard } from "@/components/ui-blocks";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import { ChapterBackgroundCard } from "@/components/scripture/chapter-background-card";
import { ScripturePassageCard } from "@/components/scripture/scripture-passage-card";
import { requireUser } from "@/lib/session";
import { getEntry } from "@/lib/entries";
import { getChapterBackground } from "@/lib/bible/chapter-background";
import { formatDateKo } from "@/lib/utils";

export async function generateMetadata() {
  return { title: "기록 상세" };
}

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const entry = await getEntry(user.id, id);
  if (!entry) notFound();

  return (
    <AppShell
      title={entry.title || "제목 없음"}
      titleClassName="font-journal text-display-lg whitespace-normal break-words overflow-visible text-clip"
      action={
        <Link
          href={`/entries/${entry.id}/edit`}
          className="cta-primary px-4"
        >
          수정
        </Link>
      }
    >
      <Breadcrumb href="/entries" label="기록" current={entry.title || "제목 없음"} className="mb-4" />
      <article className="space-y-4">
        <div>
          <p className="text-label-sm text-text-muted">
            {formatDateKo(entry.entryDate)}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <SoftBadge>
              {entry.shareVisibility === "private" ? "비공개" : "함께 공개"}
            </SoftBadge>
            {(entry.scriptureBindings?.length
              ? entry.scriptureBindings.map((b) => b.display)
              : entry.scriptureRefs
            ).map((ref) => (
              <SoftBadge key={ref}>{ref}</SoftBadge>
            ))}
            {entry.tags.map((tag) => (
              <SoftBadge key={tag}>#{tag}</SoftBadge>
            ))}
          </div>
        </div>

        {entry.scriptureBindings?.length
          ? (() => {
              const first = entry.scriptureBindings[0];
              const chapterBg = first ? getChapterBackground({ code: first.code, chapter: first.chapter, locale: "ko" }) : null;
              return (
                <>
                  {chapterBg ? <ChapterBackgroundCard background={chapterBg} /> : null}
                  {entry.scriptureBindings.map((b) => (
                    <SurfaceCard key={b.slug} className="writing-margin border-l-0">
                      <ScripturePassageCard code={b.code} chapter={b.chapter} startVerse={b.startVerse} endVerse={b.endVerse} display={b.display} translation={b.translation} />
                    </SurfaceCard>
                  ))}
                </>
              );
            })()
          : entry.scriptureExcerpt
            ? (
              <SurfaceCard className="writing-margin border-l-0">
                <p className="text-body-lg text-text-main">“{entry.scriptureExcerpt}”</p>
              </SurfaceCard>
            )
            : null}

        <SurfaceCard>
          <div className="writing-margin entry-markdown">
            <ReactMarkdown>{entry.reflectionBody}</ReactMarkdown>
          </div>
        </SurfaceCard>

        {entry.gratitude ? (
          <SurfaceCard>
            <h2 className="text-headline-sm text-primary">감사</h2>
            <p className="mt-2 whitespace-pre-wrap text-body-md">
              {entry.gratitude}
            </p>
          </SurfaceCard>
        ) : null}
        {entry.question ? (
          <SurfaceCard>
            <h2 className="text-headline-sm text-primary">질문</h2>
            <p className="mt-2 whitespace-pre-wrap text-body-md">
              {entry.question}
            </p>
          </SurfaceCard>
        ) : null}
        {entry.prayer ? (
          <SurfaceCard>
            <h2 className="text-headline-sm text-primary">기도</h2>
            <p className="mt-2 whitespace-pre-wrap text-body-md">{entry.prayer}</p>
          </SurfaceCard>
        ) : null}
        {entry.actionStep ? (
          <SurfaceCard>
            <h2 className="text-headline-sm text-primary">결단</h2>
            <p className="mt-2 whitespace-pre-wrap text-body-md">
              {entry.actionStep}
            </p>
          </SurfaceCard>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          {entry.shareVisibility === "private" ? (
            <Link href={`/entries/${entry.id}/edit`} className="cta-secondary">
              공개로 바꾸기
            </Link>
          ) : (
            <Link href="/together" className="cta-secondary">
              함께에서 보기
            </Link>
          )}
          <DeleteEntryButton id={entry.id} />
        </div>
      </article>
    </AppShell>
  );
}

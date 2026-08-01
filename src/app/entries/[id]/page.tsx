import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Breadcrumb, SoftBadge, SurfaceCard } from "@/components/ui-blocks";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import { requireUser } from "@/lib/session";
import { getEntry } from "@/lib/entries";
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
          ? entry.scriptureBindings.map((b) => (
              <SurfaceCard key={b.slug} className="writing-margin border-l-0">
                <p className="text-label-md text-gold-ink">{b.display}</p>
                {b.excerpt ? (
                  <p className="mt-2 text-body-lg text-text-main">“{b.excerpt}”</p>
                ) : null}
                <p className="mt-2 text-label-sm text-text-muted">
                  {b.translation === "ko-open-bible"
                    ? "한국어 성경 (Open Bibles) · 개역개정 아님"
                    : b.translation === "user-typed"
                      ? "사용자 입력 인용"
                      : b.translation}
                </p>
              </SurfaceCard>
            ))
          : entry.scriptureExcerpt
            ? (
              <SurfaceCard className="writing-margin border-l-0">
                <p className="text-body-lg text-text-main">
                  “{entry.scriptureExcerpt}”
                </p>
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
          <Link href={`/together?from=${entry.id}`} className="cta-secondary">
            공유
          </Link>
          <DeleteEntryButton id={entry.id} />
        </div>
      </article>
    </AppShell>
  );
}

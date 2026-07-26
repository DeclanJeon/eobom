import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, PageIntro, SoftBadge, SurfaceCard } from "@/components/ui-blocks";
import { TogetherActions } from "@/components/together-actions";
import { ShareForm } from "@/components/share-form";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateShort, parseJsonArray } from "@/lib/utils";

export const metadata = { title: "함께" };

export default async function TogetherPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const user = await requireUser();
  const { from } = await searchParams;

  const source = from
    ? await db.reflectionEntry.findFirst({
        where: { id: from, userId: user.id, deletedAt: null },
      })
    : null;

  const items = await db.sharedReflection.findMany({
    where: { visibility: "public", withdrawnAt: null, deletedAt: null },
    orderBy: { publishedAt: "desc" },
    take: 40,
    include: { reactions: true },
  });

  return (
    <AppShell title="함께">
      <PageIntro
        title="익명 묵상"
        description="원문은 공개되지 않습니다. 나누고 싶은 문장만 별도 사본으로 게시하세요. 댓글·팔로우·랭킹은 없습니다."
      />

      <SurfaceCard className="mb-5">
        <h2 className="font-serif text-xl">공유용 묵상 만들기</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          이름, 연락처, 교회명 등 식별 정보는 직접 지워 주세요.
        </p>
        <div className="mt-4">
          <ShareForm
            sourceEntryId={source?.id}
            initialBody={
              source
                ? [source.title, source.reflectionBody].filter(Boolean).join("\n\n")
                : ""
            }
            initialScripture={source ? parseJsonArray(source.scriptureRefs).join(", ") : ""}
          />
        </div>
      </SurfaceCard>

      {items.length === 0 ? (
        <EmptyState
          title="아직 나눈 묵상이 없습니다"
          description="안전하게 다듬은 문장 하나만 남겨도 충분합니다."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const counts: Record<string, number> = {};
            for (const r of item.reactions) {
              counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
            }
            return (
              <SurfaceCard key={item.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">
                    {item.pseudonym || "익명의 순례자"}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatDateShort(item.publishedAt)}
                  </span>
                  {parseJsonArray(item.scriptureRefs).map((ref) => (
                    <SoftBadge key={ref}>{ref}</SoftBadge>
                  ))}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
                  {item.publicBody}
                </p>
                <div className="mt-4">
                  <TogetherActions id={item.id} counts={counts} />
                </div>
                <Link
                  href={`/together/${item.id}`}
                  className="mt-3 inline-block text-xs text-primary"
                >
                  상세 보기
                </Link>
              </SurfaceCard>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

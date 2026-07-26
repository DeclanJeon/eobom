import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getOptionalUser } from "@/lib/session";
import { formatDateKo, excerpt, parseJsonArray } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const owner = await db.user.findUnique({
    where: { personalSlug: slug },
    select: { displayName: true, name: true },
  });
  const name = owner?.displayName || owner?.name || "순례자";
  return {
    title: `${name}의 묵상기록지`,
    description: "이어봄 개인 묵상 기록 공간",
  };
}

export default async function PersonalJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const owner = await db.user.findFirst({
    where: { personalSlug: slug, deletedAt: null },
  });
  if (!owner) notFound();

  const viewer = await getOptionalUser();
  const isOwner = viewer?.id === owner.id;
  const display = owner.displayName || owner.name || "순례자";

  const recent = isOwner
    ? await db.reflectionEntry.findMany({
        where: { userId: owner.id, deletedAt: null },
        orderBy: { entryDate: "desc" },
        take: 5,
      })
    : [];

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            ✿
          </span>
          <Link href="/" className="font-journal text-title-journal text-primary">
            이어봄
          </Link>
        </div>
        <h1 className="text-display-lg text-primary">
          {display}의
          <br />
          묵상기록지
        </h1>
        <p className="mt-3 text-body-md text-text-muted">
          {isOwner
            ? "나만의 입구입니다."
            : viewer
              ? "다른 사람의 개인 입구입니다."
              : "로그인하면 내 기록으로 이어집니다."}
        </p>

        <div className="mt-10">
          {isOwner ? (
            <Link href="/entries/new" className="cta-primary w-full py-4">
              기록하기
            </Link>
          ) : viewer ? (
            <Link href="/today" className="cta-primary w-full py-4">
              내 홈으로
            </Link>
          ) : (
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/j/${slug}`)}`}
              className="cta-primary w-full py-4"
            >
              로그인
            </Link>
          )}
        </div>

        {isOwner && recent.length > 0 ? (
          <section className="mt-10 space-y-2 text-left">
            <h2 className="text-label-md text-text-muted">최근</h2>
            {recent.map((entry) => (
              <Link
                key={entry.id}
                href={`/entries/${entry.id}`}
                className="paper-card mb-2 block p-4"
              >
                <p className="text-label-sm text-text-muted">
                  {formatDateKo(entry.entryDate)}
                </p>
                <h3 className="mt-1 text-headline-sm text-primary">
                  {entry.title ||
                    parseJsonArray(entry.scriptureRefs)[0] ||
                    "제목 없음"}
                </h3>
                <p className="mt-1 text-body-md text-text-muted">
                  {excerpt(entry.reflectionBody, 80)}
                </p>
              </Link>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}

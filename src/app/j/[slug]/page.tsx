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
    <div className="relative flex min-h-dvh items-center justify-center px-6 py-10">
      <div className="pointer-events-none absolute inset-0 paper-grain" />
      <div className="relative w-full max-w-md text-center">
        <Link href="/" className="font-serif text-2xl text-primary">
          이어봄
        </Link>
        <h1 className="mt-8 font-serif text-3xl tracking-tight">
          {display}의 묵상기록지
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {isOwner
            ? "나만의 입구입니다."
            : viewer
              ? "다른 사람의 개인 입구입니다."
              : "로그인하면 내 기록으로 이어집니다."}
        </p>

        <div className="mt-10">
          {isOwner ? (
            <Link
              href="/entries/new"
              className="inline-flex w-full items-center justify-center rounded-full bg-foreground px-6 py-4 text-base font-medium text-background"
            >
              기록하기
            </Link>
          ) : viewer ? (
            <Link
              href="/today"
              className="inline-flex w-full items-center justify-center rounded-full bg-foreground px-6 py-4 text-base font-medium text-background"
            >
              내 홈으로
            </Link>
          ) : (
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/j/${slug}`)}`}
              className="inline-flex w-full items-center justify-center rounded-full bg-foreground px-6 py-4 text-base font-medium text-background"
            >
              로그인
            </Link>
          )}
        </div>

        {isOwner && recent.length > 0 ? (
          <section className="mt-10 space-y-2 text-left">
            <h2 className="text-sm font-medium text-muted-foreground">최근</h2>
            {recent.map((entry) => (
              <Link
                key={entry.id}
                href={`/entries/${entry.id}`}
                className="block rounded-2xl border border-border/80 bg-card/90 p-4"
              >
                <p className="text-xs text-muted-foreground">
                  {formatDateKo(entry.entryDate)}
                </p>
                <h3 className="mt-1 font-serif text-lg">
                  {entry.title ||
                    parseJsonArray(entry.scriptureRefs)[0] ||
                    "제목 없음"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
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

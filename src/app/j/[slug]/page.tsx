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

  const recent = isOwner
    ? await db.reflectionEntry.findMany({
        where: { userId: owner.id, deletedAt: null },
        orderBy: { entryDate: "desc" },
        take: 5,
      })
    : [];

  const display = owner.displayName || owner.name || "순례자";

  return (
    <div className="relative min-h-dvh px-4 py-8">
      <div className="pointer-events-none absolute inset-0 paper-grain" />
      <div className="relative mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl text-primary">
            이어봄
          </Link>
          {viewer ? (
            <Link href="/today" className="text-sm text-muted-foreground">
              내 홈
            </Link>
          ) : (
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/j/${slug}`)}`}
              className="rounded-full bg-foreground px-4 py-2 text-sm text-background"
            >
              로그인
            </Link>
          )}
        </div>

        <section className="rounded-[1.75rem] border border-border/80 bg-card/90 p-2 shadow-[0_24px_70px_-42px_rgba(30,30,10,0.5)]">
          <div className="rounded-[1.35rem] bg-[linear-gradient(180deg,#fffdf8,#f4f0e6)] px-6 py-8">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
              personal journal
            </p>
            <h1 className="mt-3 font-serif text-4xl tracking-tight">
              {display}의 묵상기록지
            </h1>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
              이 주소는 개인 전용 입구입니다. QR로 들어왔다면, 로그인 후 나만의
              기록 공간으로 이어집니다. 다른 사람의 원문 묵상은 공개되지 않습니다.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {isOwner ? (
                <>
                  <Link
                    href="/today"
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
                  >
                    오늘로 이동
                  </Link>
                  <Link
                    href="/entries/new"
                    className="rounded-full border border-border bg-white/70 px-5 py-2.5 text-sm"
                  >
                    묵상 기록하기
                  </Link>
                  <Link
                    href="/me/qr"
                    className="rounded-full border border-border bg-white/70 px-5 py-2.5 text-sm"
                  >
                    QR 보기
                  </Link>
                </>
              ) : viewer ? (
                <p className="text-sm text-muted-foreground">
                  이 페이지는 {display}님의 개인 입구입니다. 내 기록은{" "}
                  <Link href="/today" className="text-primary">
                    오늘
                  </Link>
                  에서 확인하세요.
                </p>
              ) : (
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/j/${slug}`)}`}
                  className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
                >
                  Google로 내 기록 열기
                </Link>
              )}
            </div>
          </div>
        </section>

        {isOwner && recent.length > 0 ? (
          <section className="mt-6 space-y-3">
            <h2 className="font-serif text-2xl">최근 내 기록</h2>
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
                  {entry.title || parseJsonArray(entry.scriptureRefs)[0] || "제목 없음"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {excerpt(entry.reflectionBody, 100)}
                </p>
              </Link>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}

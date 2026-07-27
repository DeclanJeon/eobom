import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LoginButton } from "@/components/login-button";
import { db } from "@/lib/db";
import { getOptionalUser } from "@/lib/session";
import { excerpt, formatDateKo, parseJsonArray } from "@/lib/utils";
import {
  claimErrorMessage,
  getSeatBySlug,
  isSeatSlug,
  normalizeSeatSlug,
  type ClaimErrorCode,
} from "@/lib/seats";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const seat = await getSeatBySlug(slug);
  if (seat?.status === "claimed" && seat.claimedUser) {
    const name =
      seat.claimedUser.displayName || seat.claimedUser.name || "순례자";
    return {
      title: `${name}의 묵상기록지`,
      description: "이어봄 개인 묵상 기록 공간",
    };
  }
  return {
    title: "나의 묵상기록지",
    description: "이어봄 키링 개인 묵상 기록 공간",
  };
}

export default async function PersonalJournalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ claim?: string }>;
}) {
  const { slug: raw } = await params;
  const slug = normalizeSeatSlug(raw);
  const sp = await searchParams;
  const viewer = await getOptionalUser();

  // Prefer seat table; fall back to user.personalSlug for non-keyring slugs
  const seat = await getSeatBySlug(slug);
  const legacyOwner =
    !seat
      ? await db.user.findFirst({
          where: { personalSlug: slug, deletedAt: null },
        })
      : null;

  if (!seat && !legacyOwner) {
    notFound();
  }

  if (seat?.status === "revoked") {
    return (
      <Shell>
        <h1 className="text-display-lg text-primary">사용할 수 없는 키링</h1>
        <p className="mt-3 text-body-md text-text-muted">
          {claimErrorMessage("revoked")}
        </p>
        <Link href="/contact" className="cta-secondary mt-8 inline-flex">
          문의
        </Link>
      </Shell>
    );
  }

  // Logged-in visitor with seat: owner home vs first claim vs other
  if (viewer && seat) {
    if (seat.claimedUserId === viewer.id) {
      const display =
        viewer.displayName ||
        viewer.name ||
        seat.claimedUser?.displayName ||
        seat.claimedUser?.name ||
        "나";
      return (
        <OwnerView slug={slug} userId={viewer.id} display={display} />
      );
    }

    if (seat.status === "unclaimed") {
      // Cookie writes are only allowed in Route Handlers / Server Actions.
      redirect(`/api/seats/claim?slug=${encodeURIComponent(slug)}`);
    }

    // claimed by someone else
    if (seat.claimedUserId && seat.claimedUserId !== viewer.id) {
      return (
        <Shell>
          <h1 className="text-display-lg text-primary">
            다른 사람의 키링입니다
          </h1>
          <p className="mt-3 text-body-md text-text-muted">
            이 주소는 이미 다른 계정에 연결되어 있습니다.
          </p>
          <Link href="/today" className="cta-primary mt-8 inline-flex">
            내 홈으로
          </Link>
        </Shell>
      );
    }
  }

  // Owner via legacy user slug
  if (viewer && legacyOwner && viewer.id === legacyOwner.id) {
    return <OwnerView slug={slug} userId={viewer.id} display={viewer.displayName || viewer.name || "나"} />;
  }

  if (viewer && legacyOwner && viewer.id !== legacyOwner.id) {
    return (
      <Shell>
        <h1 className="text-display-lg text-primary">다른 사람의 입구입니다</h1>
        <Link href="/today" className="cta-primary mt-8 inline-flex">
          내 홈으로
        </Link>
      </Shell>
    );
  }

  // Guest + claimed seat (or legacy owner exists)
  const isClaimed =
    (seat && seat.status === "claimed") || Boolean(legacyOwner);

  if (!viewer && isClaimed) {
    return (
      <Shell>
        <p className="text-label-sm text-text-muted">키링 {slug}</p>
        <h1 className="mt-2 text-display-lg text-primary">
          연결된
          <br />
          묵상기록지
        </h1>
        <p className="mt-3 text-body-md text-text-muted">
          Google로 이어서 로그인하면 내 기록으로 들어갑니다.
        </p>
        {sp.claim === "error" ? (
          <p className="mt-4 text-label-md text-destructive">
            연결에 실패했습니다. 처음 연결한 Google 계정으로 로그인해 주세요.
          </p>
        ) : null}
        <div className="mt-10">
          <LoginButton
            callbackUrl={`/j/${slug}`}
            claimSlug={isSeatSlug(slug) ? slug : undefined}
            label="Google로 이어서"
          />
        </div>
      </Shell>
    );
  }

  // Guest + unclaimed seat — primary QR first-run
  return (
    <Shell>
      <p className="text-label-sm text-accent-gold">키링 {slug.toUpperCase()}</p>
      <h1 className="mt-2 text-display-lg text-primary">
        나의
        <br />
        묵상기록지
      </h1>
      <p className="mt-3 text-body-md text-text-muted">
        이 키링은 당신만의 입구입니다.
        <br />
        Google로 연결하면 이 주소가 당신 기록이 됩니다.
      </p>
      {renderClaimQueryError(sp.claim)}
      <div className="mt-10">
        <LoginButton
          callbackUrl={`/j/${slug}`}
          claimSlug={slug}
          label="Google로 시작하기"
        />
      </div>
      <p className="mt-6 text-label-sm text-text-muted">
        연결 후 같은 기기에서는 자동으로 로그인 상태가 유지됩니다.
      </p>
    </Shell>
  );
}

function renderClaimQueryError(code?: string) {
  if (!code || code === "1") return null;
  const known: ClaimErrorCode[] = [
    "already_claimed",
    "user_has_other_seat",
    "revoked",
    "invalid",
  ];
  const msg = known.includes(code as ClaimErrorCode)
    ? claimErrorMessage(code as ClaimErrorCode)
    : "연결에 실패했습니다.";
  return (
    <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-label-md text-destructive">
      {msg}
    </p>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
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
        {children}
      </div>
    </div>
  );
}

async function OwnerView({
  slug,
  userId,
  display,
}: {
  slug: string;
  userId: string;
  display: string;
}) {
  const recent = await db.reflectionEntry.findMany({
    where: { userId, deletedAt: null },
    orderBy: { entryDate: "desc" },
    take: 5,
  });

  return (
    <Shell>
      <p className="text-label-sm text-text-muted">/j/{slug}</p>
      <h1 className="mt-2 text-display-lg text-primary">
        {display}의
        <br />
        묵상기록지
      </h1>
      <p className="mt-3 text-body-md text-text-muted">나만의 입구입니다.</p>
      <Link href="/entries/new" className="cta-primary mt-10 inline-flex w-full py-4">
        기록하기
      </Link>
      {recent.length > 0 ? (
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
    </Shell>
  );
}

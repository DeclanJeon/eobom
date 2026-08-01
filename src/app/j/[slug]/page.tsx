import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { LoginButton } from "@/components/login-button";
import { KeyringClaimPrompt } from "@/components/keyring-claim-prompt";
import { OwnerLoginPrompt } from "@/components/owner-login-prompt";
import { db } from "@/lib/db";
import { getOptionalUser } from "@/lib/session";
import { excerpt, formatDateKo, parseJsonArray } from "@/lib/utils";
import {
  claimErrorMessage,
  getDeviceTokenHash,
  getSeatBySlug,
  isOwnerDevice,
  isSeatSlug,
  normalizeSeatSlug,
  type ClaimErrorCode,
} from "@/lib/seats";
import { decideKeyringAccess } from "@/lib/keyring-access";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const seat = await getSeatBySlug(slug);
  // claimed 상태여도 소유자 이름을 노출하지 않는다 (개인정보 보호).
  return {
    title: "개인 묵상기록지",
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
  const jar = await cookies();
  const deviceHash = getDeviceTokenHash(jar.toString());

  // Prefer seat table; fall back to user.personalSlug for non-keyring slugs
  const seat = await getSeatBySlug(slug);
  const legacyOwner =
    !seat
      ? await db.user.findFirst({
          where: { personalSlug: slug, deletedAt: null },
        })
      : null;

  const access = await decideKeyringAccess({
    seat,
    legacyOwner,
    viewer,
    deviceHash,
  });

  switch (access.kind) {
    case "not_found": {
      notFound();
      break;
    }
    case "revoked": {
      return (
        <Shell isAuthenticated={Boolean(viewer)}>
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
    case "owner_home": {
      // 기기 미등록이면 이 브라우저를 등록한다 (쿠키는 Route Handler에서만 쓸 수 있음).
      const ownerDevice = await isOwnerDevice(viewer!.id, deviceHash);
      if (!ownerDevice) {
        redirect(`/api/seats/device?slug=${encodeURIComponent(slug)}`);
      }
      const display =
        viewer!.displayName ||
        viewer!.name ||
        seat?.claimedUser?.displayName ||
        seat?.claimedUser?.name ||
        "나";
      return <OwnerView slug={slug} userId={viewer!.id} display={display} />;
    }
    case "claim_prompt": {
      return (
        <Shell isAuthenticated={Boolean(viewer)}>
          <p className="text-eyebrow">키링 {slug.toUpperCase()}</p>
          <KeyringClaimPrompt slug={slug} />
          <p className="mt-6 text-label-sm text-text-muted">
            연결 후 이 브라우저는 소유자 기기로 등록됩니다.
          </p>
        </Shell>
      );
    }
    case "blocked_other": {
      return (
        <Shell isAuthenticated={Boolean(viewer)}>
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
    case "owner_legacy": {
      return (
        <OwnerView
          slug={slug}
          userId={viewer!.id}
          display={viewer!.displayName || viewer!.name || "나"}
        />
      );
    }
    case "blocked_legacy_other": {
      return (
        <Shell isAuthenticated={Boolean(viewer)}>
          <h1 className="text-display-lg text-primary">다른 사람의 키링입니다</h1>
          <Link href="/today" className="cta-primary mt-8 inline-flex">
            내 홈으로
          </Link>
        </Shell>
      );
    }
    case "owner_login_prompt": {
      return (
        <Shell isAuthenticated={Boolean(viewer)}>
          <OwnerLoginPrompt slug={slug} />
        </Shell>
      );
    }
    case "private_page": {
      return (
        <Shell isAuthenticated={Boolean(viewer)}>
          <p className="text-label-sm text-text-muted">키링 {slug}</p>
          <h1 className="mt-2 text-display-lg text-primary">
            이 주소는
            <br />
            개인 기록 공간입니다
          </h1>
          <p className="mt-3 text-body-md text-text-muted">
            이 개인 기록 공간은 소유자만 접근할 수 있습니다. 본인 기기라면 소유자 계정으로 로그인해 주세요.
          </p>
          <Link href="/contact" className="cta-secondary mt-8 inline-flex">
            문의
          </Link>
        </Shell>
      );
    }
    case "first_register": {
      return (
        <Shell isAuthenticated={Boolean(viewer)}>
          <p className="text-eyebrow">키링 {slug.toUpperCase()}</p>
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
              claimSlug={isSeatSlug(slug) ? slug : undefined}
              label="Google로 시작하기"
            />
          </div>
          <p className="mt-6 text-label-sm text-text-muted">
            연결 후 이 브라우저는 소유자 기기로 등록되어 자동으로 인식됩니다.
          </p>
        </Shell>
      );
    }
  }
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
    <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-label-md text-destructive" role="alert">
      {msg}
    </p>
  );
}

function Shell({
  children,
  isAuthenticated,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex items-center justify-center gap-2">
          <img src="/logo.svg" alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
          <Link
            href={isAuthenticated ? "/today" : "/"}
            className="inline-flex min-h-11 items-center font-journal text-title-journal text-primary"
          >
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
    <Shell isAuthenticated>
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
          <h2 className="text-headline-sm text-primary">최근</h2>
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

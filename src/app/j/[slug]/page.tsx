import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { LoginButton } from "@/components/login-button";
import { KeyringClaimPrompt } from "@/components/keyring-claim-prompt";
import { OwnerLoginPrompt } from "@/components/owner-login-prompt";
import { GlobalScriptureCard } from "@/components/today/global-scripture-card";
import { TodayCard } from "@/components/today/today-card";
import { GlobalCardImpression } from "@/components/today/global-card-impression";
import { KeyringLandingSeen } from "@/components/j/landing-seen";
import { db } from "@/lib/db";
import { getOptionalUser } from "@/lib/session";
import { getCheckin } from "@/lib/checkin";
import { toKstDateKey } from "@/lib/kst";
import { selectGlobalScripture } from "@/lib/daily-scripture";
import { selectCardPolicy } from "@/lib/select-card";
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
import { eventMessageForSeat } from "@/lib/retreat-event";
import { pastTodayDateRanges } from "@/lib/past-today";
import {
  elapsedDaysKst,
  findTimeCapsuleCandidates,
  timeCapsuleLabel,
} from "@/lib/time-capsule";
import { recentlyExposedEntryIds } from "@/lib/memory-exposure";
import { getUserPreferenceFlags } from "@/lib/user-preferences";

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
      // 폐기된 키링은 사용할 수 없는 상태이므로 전역 카드·impression을 의도적으로 표시하지 않는다.
      return (
        <Shell isAuthenticated={Boolean(viewer)} slug={slug}>
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
        <Shell isAuthenticated={Boolean(viewer)} slug={slug}>
          <GuestKeyringCard now={new Date()} />
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
        <Shell isAuthenticated={Boolean(viewer)} slug={slug}>
          <GuestKeyringCard now={new Date()} />
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
        <Shell isAuthenticated={Boolean(viewer)} slug={slug}>
          <GuestKeyringCard now={new Date()} />
          <h1 className="text-display-lg text-primary">다른 사람의 키링입니다</h1>
          <Link href="/today" className="cta-primary mt-8 inline-flex">
            내 홈으로
          </Link>
        </Shell>
      );
    }
    case "owner_login_prompt": {
      return (
        <Shell isAuthenticated={Boolean(viewer)} slug={slug}>
          <GuestKeyringCard now={new Date()} />
          <OwnerLoginPrompt slug={slug} />
        </Shell>
      );
    }
    case "private_page": {
      return (
        <Shell isAuthenticated={Boolean(viewer)} slug={slug}>
          <GuestKeyringCard now={new Date()} />
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
        <Shell isAuthenticated={Boolean(viewer)} slug={slug}>
          <GuestKeyringCard now={new Date()} />
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

function GuestKeyringCard({ now }: { now: Date }) {
  return (
    <div className="mb-6 text-left">
      <GlobalCardImpression dateKey={toKstDateKey(now)} surface="keyring_guest" />
      <GlobalScriptureCard now={now} />
    </div>
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
    <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-label-md text-destructive" role="alert">
      {msg}
    </p>
  );
}

function Shell({
  children,
  isAuthenticated,
  slug,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
  slug: string;
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
      {/* 키링 랜딩 계측 — 서버 렌더 금지, 클라이언트 세션당 1회 (B4·B2) */}
      <KeyringLandingSeen slug={slug} />
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
  const now = new Date();
  const dateKey = toKstDateKey(now);
  const flags = await getUserPreferenceFlags(userId);
  // pastTodayEnabled is a user privacy/feature preference; honor it on keyring too.
  // 수련회 이벤트 DAY 30/90 메시지 (G013) — 있으면 그 카드가 최우선
  const eventMessage = await eventMessageForSeat(slug, now);
  const [recent, timeCapsule, pastToday, lastWeek, reactionChecks] = await Promise.all([
    db.reflectionEntry.findMany({
      where: { userId, deletedAt: null },
      orderBy: { entryDate: "desc" },
      take: 3,
    }),
    findTimeCapsuleCandidates(userId, now),
    flags.pastTodayEnabled
      ? (async () => {
          const ranges = pastTodayDateRanges(now, 8);
          if (!ranges.length) return null;
          return db.reflectionEntry.findFirst({
            where: {
              userId,
              deletedAt: null,
              OR: ranges.map((r) => ({ entryDate: { gte: r.gte, lte: r.lte } })),
            },
            orderBy: { entryDate: "desc" },
          });
        })()
      : Promise.resolve(null),
    db.reflectionEntry.findFirst({
      where: {
        userId,
        deletedAt: null,
        entryDate: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { entryDate: "desc" },
    }),
    db.dailyCheckIn.findMany({
      where: { userId, reaction: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: { cardKey: true },
    }),
  ]);

  const exposed = await recentlyExposedEntryIds(userId, { now });
  const reactionEntryIds = reactionChecks
    .map((r) => r.cardKey.startsWith("memory:") ? r.cardKey.slice("memory:".length) : null)
    .filter((id): id is string => id !== null && !exposed.has(id));
  const reactionEntries = reactionEntryIds.length
    ? await db.reflectionEntry.findMany({
        where: { id: { in: reactionEntryIds }, userId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  // 키링 경로 = Memory 우선 (G3): 타임캡슐 → 과거의 오늘 → 지난주 → 리액션 → 말씀.
  // 모든 fallback 후보도 MemoryExposure 14일 필터를 통과해야 한다 (architecture gate).
  const pastCandidate = pastToday && !exposed.has(pastToday.id) ? pastToday : null;
  const lastWeekCandidate = lastWeek && !exposed.has(lastWeek.id) ? lastWeek : null;
  const selection = selectCardPolicy({
    surface: "keyring",
    dateKey,
    timeCapsule,
    pastToday: pastCandidate
      ? [
          {
            sourceType: "entry",
            sourceId: pastCandidate.id,
            entryId: pastCandidate.id,
            entryDate: pastCandidate.entryDate,
            display:
              pastCandidate.title ||
              parseJsonArray(pastCandidate.scriptureRefs)[0] ||
              "그날의 기록",
            excerpt: excerpt(pastCandidate.reflectionBody, 90),
          },
        ]
      : [],
    lastWeek: lastWeekCandidate
      ? [
          {
            sourceType: "entry",
            sourceId: lastWeekCandidate.id,
            entryId: lastWeekCandidate.id,
            entryDate: lastWeekCandidate.entryDate,
            display:
              lastWeekCandidate.title ||
              parseJsonArray(lastWeekCandidate.scriptureRefs)[0] ||
              "최근 기록",
            excerpt: excerpt(lastWeekCandidate.reflectionBody, 90),
          },
        ]
      : [],
    reactions: reactionEntries.map((entry) => ({
      sourceType: "reaction" as const,
      sourceId: entry.id,
      entryId: entry.id,
      entryDate: entry.entryDate,
      display:
        entry.title ||
        parseJsonArray(entry.scriptureRefs)[0] ||
        "다시 읽은 기록",
      excerpt: excerpt(entry.reflectionBody, 90),
    })),
  });

  let cardContent;
  let heroCardKey = "";
  if (eventMessage) {
    // 이벤트 DAY 카드 (G013) — 공용 메시지 (기획 작성), 기록 아님 → prompt 종류
    cardContent = {
      kind: "prompt" as const,
      display: eventMessage.message,
      hint: eventMessage.label,
    };
    heroCardKey = `event:${eventMessage.eventId ?? slug}:${eventMessage.day}`;
  } else if (selection.kind === "memory" && selection.candidate) {
    const c = selection.candidate;
    cardContent = {
      kind: "memory" as const,
      label: c.anchorDays
        ? timeCapsuleLabel(c.anchorDays, elapsedDaysKst(now, c.entryDate!))
        : pastCandidate?.id === c.entryId
          ? "과거의 오늘"
          : "지난주 내 한 문장",
      display: c.display,
      excerpt: c.excerpt,
      entryId: c.entryId!,
    };
    heroCardKey = selection.cardKey;
  } else {
    const scripture = selectGlobalScripture(now);
    cardContent = {
      kind: "scripture" as const,
      display: scripture.display,
      text: scripture.text,
      background: scripture.background,
      sourceLabel: "오늘 함께 읽을 말씀",
    };
    heroCardKey = `scripture:${dateKey}`;
  }

  const cardWriteHref =
    cardContent?.kind === "memory"
      ? `/entries/${cardContent.entryId}/edit`
      : "/entries/new";

  const existingCheckin = cardContent
    ? await getCheckin(userId, dateKey, heroCardKey)
    : null;

  return (
    <Shell isAuthenticated slug={slug}>
      <p className="text-label-sm text-text-muted">/j/{slug}</p>
      <h1 className="mt-2 text-display-lg text-primary">
        {display}의
        <br />
        묵상기록지
      </h1>
      <p className="mt-3 text-body-md text-text-muted">나만의 입구입니다.</p>

      <div className="mt-8 text-left">
        <TodayCard
          cardKey={heroCardKey}
          surface="keyring"
          dateKey={dateKey}
          identityKey={userId}
          content={cardContent}
          initialReaction={existingCheckin?.reaction ?? null}
          initialOneLine={existingCheckin?.oneLine ?? null}
          initialEntryId={existingCheckin?.entryId ?? null}
          writeHref={cardWriteHref}
        />
      </div>

      {recent.length > 0 ? (
        <section className="mt-8 space-y-2 text-left">
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

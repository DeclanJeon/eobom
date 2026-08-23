import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ANON_NAMES } from "@/lib/anon-name";
import {
  DEVICE_COOKIE,
  allocateWebUserSlug,
  generateDeviceToken,
  hashDeviceToken,
  registerDevice,
} from "@/lib/seats";

export type ApiUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  personalSlug: string;
  displayName: string;
  aiProcessingConsent: boolean;
  communityEnabled: boolean;
  pastTodayEnabled: boolean;
};

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  displayName: string | null;
  image: string | null;
  profileImageUrl: string | null;
  personalSlug: string;
  aiProcessingConsent: boolean;
  communityEnabled: boolean;
  pastTodayEnabled: boolean;
};

function toApiUser(u: UserRow): ApiUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.profileImageUrl ?? u.image,
    personalSlug: u.personalSlug,
    displayName: u.displayName ?? "",
    aiProcessingConsent: u.aiProcessingConsent,
    communityEnabled: u.communityEnabled,
    pastTodayEnabled: u.pastTodayEnabled,
  };
}

export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * 현재 방문자 정체성 해석.
 * 1) 레거시 Google 세션 (기존 유저 보존, 로그인 진입점은 제거됨)
 * 2) 기기 토큰 → 익명 identity (UserDevice)
 * 둘 다 없으면 null (부트스트랩 전 게스트).
 */
export async function getCurrentUser(): Promise<ApiUser | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return session.user as ApiUser;

  const jar = await cookies();
  const token = jar.get(DEVICE_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashDeviceToken(token);
  const device = await db.userDevice.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (device?.user && !device.revokedAt) return toApiUser(device.user);
  return null;
}

export async function getOptionalUser() {
  return getCurrentUser();
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/today");
  return user;
}

export async function requireApiUser(): Promise<
  { ok: true; user: ApiUser } | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

/**
 * 이름 풀에서 중복 없이 첫 번째 미사용 이름을 골라온다.
 * DB 조회가 있으나 첫 방문 시 1회만 호출되므로 성능 무관.
 * 437개 풀이 다 소진되면 타임스탬프 기반 fallback.
 */
async function pickUniqueAnonName(): Promise<string> {
  const used = new Set(
    (
      await db.user.findMany({
        where: { displayName: { in: ANON_NAMES as unknown as string[] } },
        select: { displayName: true },
      })
    )
      .map((u) => u.displayName)
      .filter((n): n is string => n !== null),
  );
  for (const name of ANON_NAMES) {
    if (!used.has(name)) return name;
  }
  return `익명${Date.now().toString(36)}`;
}

/**
 * 익명 기기 정체성 생성 — 이메일 없는 User + 기기 등록.
 * 중복 없는 캐릭터 이름을 displayName에 자동 배정.
 * 반환 토큰은 호출자(Route Handler)가 DEVICE_COOKIE로 설정해야 한다.
 */
export async function createDeviceIdentity(): Promise<{
  user: ApiUser;
  token: string;
}> {
  const { token } = generateDeviceToken();
  const personalSlug = await allocateWebUserSlug();
  const displayName = await pickUniqueAnonName();
  const user = await db.user.create({ data: { personalSlug, displayName } });
  await registerDevice(user.id, token);
  return { user: toApiUser(user), token };
}

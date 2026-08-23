import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
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
 * 익명 기기 정체성 생성 — 이메일 없는 User + 기기 등록.
 * 반환 토큰은 호출자(Route Handler)가 DEVICE_COOKIE로 설정해야 한다.
 */
export async function createDeviceIdentity(): Promise<{
  user: ApiUser;
  token: string;
}> {
  const { token } = generateDeviceToken();
  const personalSlug = await allocateWebUserSlug();
  const user = await db.user.create({ data: { personalSlug } });
  await registerDevice(user.id, token);
  return { user: toApiUser(user), token };
}

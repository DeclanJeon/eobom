import { db } from "@/lib/db";

export type UserPreferenceFlags = {
  aiProcessingConsent: boolean;
  communityEnabled: boolean;
  pastTodayEnabled: boolean;
  storyMirrorEnabled: boolean;
};

export const CONSENT_AI = "CONSENT_AI" as const;
export const CONSENT_COMMUNITY = "CONSENT_COMMUNITY" as const;

export const CONSENT_AI_MESSAGE =
  "AI 회고를 쓰려면 설정에서 기록 외부 처리 허용이 필요합니다.";

export const CONSENT_AI_TAGS_MESSAGE =
  "AI 주제 태그를 쓰려면 설정에서 기록 외부 처리 허용이 필요합니다.";

export const CONSENT_COMMUNITY_MESSAGE =
  "함께 나눔을 쓰려면 설정에서 익명 피드 참여를 켜 주세요.";

const DEFAULT_FLAGS: UserPreferenceFlags = {
  aiProcessingConsent: false,
  communityEnabled: false,
  pastTodayEnabled: true,
  storyMirrorEnabled: false,
};

/** Load consent/feature flags from DB (source of truth, not session cache). */
export async function getUserPreferenceFlags(
  userId: string,
): Promise<UserPreferenceFlags> {
  const row = await db.user.findUnique({
    where: { id: userId },
    select: {
      aiProcessingConsent: true,
      communityEnabled: true,
      pastTodayEnabled: true,
      storyMirrorEnabled: true,
    },
  });
  if (!row) return { ...DEFAULT_FLAGS };
  return {
    aiProcessingConsent: Boolean(row.aiProcessingConsent),
    communityEnabled: Boolean(row.communityEnabled),
    pastTodayEnabled: row.pastTodayEnabled !== false,
    storyMirrorEnabled: Boolean(row.storyMirrorEnabled),
  };
}

export function consentAiDeniedBody(message = CONSENT_AI_MESSAGE) {
  return { error: message, code: CONSENT_AI as typeof CONSENT_AI };
}

export function consentCommunityDeniedBody() {
  return {
    error: CONSENT_COMMUNITY_MESSAGE,
    code: CONSENT_COMMUNITY as typeof CONSENT_COMMUNITY,
  };
}

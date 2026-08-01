/**
 * Situational Wisdom Middleware — Type definitions
 *
 * 주역 64괘를 탈종교화한 상황 프로파일과 7주제 체계를 정의한다.
 * 모든 용어는 기독교 성찰 언어로만 표현되며, 동양 철학 용어는 내부 코드명(archetype)에만 사용.
 */

export type WisdomTheme =
  | "growth"
  | "connection"
  | "success"
  | "role"
  | "advance"
  | "resource"
  | "crisis";

export type SituationPhase = {
  stage: "early" | "developing" | "peak" | "overreach" | "return";
  signal: string;
  caution: string;
  reflection: string;
};

export type SituationStructure = {
  image: string;
  dynamic: string;
  posture: string;
};

export type SituationGuidance = {
  coreQuestion: string;
  avoidPattern: string;
  embracePattern: string;
};

export type SituationTransitions = {
  from: string[];
  to: string[];
  transitionQuestion: string;
};

export type SituationProfile = {
  id: string;
  archetype: string;
  label: string;
  theme: WisdomTheme;
  structure: SituationStructure;
  phases: SituationPhase[];
  guidance: SituationGuidance;
  transitions: SituationTransitions;
  scripturalResonance: string[];
};

export type ThemeMeta = {
  id: WisdomTheme;
  label: string;
  description: string;
  situationIds: string[];
};

export type SituationContext = {
  primary: SituationProfile;
  secondary?: SituationProfile;
  theme: WisdomTheme;
  phase: string;
  reasoning: string;
};

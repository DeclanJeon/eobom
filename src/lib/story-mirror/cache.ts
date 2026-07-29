/**
 * Story Mirror — Cache & Fingerprint
 *
 * 매칭 결과의 캐시 키 생성과 동일 입력 중복 실행 방지.
 */

import { createHash } from "crypto";
import type { EntryForProfile } from "./user-profile";

/**
 * 사용자 입력의 fingerprint를 생성한다.
 * entry ID + 수정시각 + 선택 범위의 해시.
 */
export function computeInputFingerprint(
  entries: EntryForProfile[],
  corpusVersion: string,
  matcherVersion: string,
): string {
  const payload = entries
    .map((e) => `${e.id}:${e.entryDate}`)
    .sort()
    .join("|");

  return createHash("sha256")
    .update(`${payload}::${corpusVersion}::${matcherVersion}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * fingerprint + 버전으로 캐시 키 생성
 */
export function cacheKey(
  fingerprint: string,
  corpusVersion: string,
  matcherVersion: string,
): string {
  return `sm:${corpusVersion}:${matcherVersion}:${fingerprint}`;
}

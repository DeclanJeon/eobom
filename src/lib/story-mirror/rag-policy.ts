/**
 * RAG policy gate — consent / rights / corpus version check.
 * 다음 단계에서 rag/runs/stream 등에서 호출하도록 설계된 순수 모듈.
 */
import { RAG_CORPUS_VERSION } from "./rag-search";

export const POLICY_VERSION = "v4.2";

export class RagPolicyError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "RagPolicyError";
    this.code = code;
  }
}

export type RagPolicyInput = {
  consent: boolean;
  rightsStatus: string;
  corpusVersion: string;
  consentSnapshot?: string | null;
};

/**
 * RAG 실행 전 정책 검증.
 * - consent === false → throw CONSENT_REQUIRED
 * - rightsStatus !== "approved" → throw RIGHTS_NOT_APPROVED
 * - corpusVersion !== RAG_CORPUS_VERSION → throw CORPUS_MISMATCH
 * - consentSnapshot이 제공되면 JSON 파싱 후 enabled/externalConsent 검증
 */
export function checkRagPolicy(input: RagPolicyInput): void {
  if (!input.consent) {
    throw new RagPolicyError("CONSENT_REQUIRED", "story-mirror consent required");
  }
  if (input.rightsStatus !== "approved") {
    throw new RagPolicyError("RIGHTS_NOT_APPROVED", `rightsStatus must be approved, got ${input.rightsStatus}`);
  }
  if (input.corpusVersion !== RAG_CORPUS_VERSION) {
    throw new RagPolicyError(
      "CORPUS_MISMATCH",
      `corpusVersion mismatch: expected ${RAG_CORPUS_VERSION}, got ${input.corpusVersion}`,
    );
  }
  if (input.consentSnapshot !== undefined && input.consentSnapshot !== null) {
    validateConsentSnapshot(input.consentSnapshot);
  }
}

export function validateConsentSnapshot(snapshot: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot);
  } catch {
    throw new RagPolicyError("CONSENT_SNAPSHOT_INVALID", "consentSnapshot is not valid JSON");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new RagPolicyError("CONSENT_SNAPSHOT_INVALID", "consentSnapshot must be an object");
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.enabled !== true && obj.enabled !== false) {
    throw new RagPolicyError("CONSENT_SNAPSHOT_INVALID", "consentSnapshot.enabled must be boolean");
  }
  if (obj.externalConsent !== true && obj.externalConsent !== false) {
    throw new RagPolicyError("CONSENT_SNAPSHOT_INVALID", "consentSnapshot.externalConsent must be boolean");
  }
  if (!obj.enabled || !obj.externalConsent) {
    throw new RagPolicyError("CONSENT_REQUIRED", "consentSnapshot indicates consent not granted");
  }
}

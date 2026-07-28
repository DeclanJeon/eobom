export type SafetyScanResult = {
  findings: string[];
  blocked: boolean;
};

/** Shared reflection public-body safety scan (PII / crisis). */
export function scanSharedReflectionSafety(text: string): SafetyScanResult {
  const findings: string[] = [];
  if (/(010|011|016|017|018|019)[-.\s]?\d{3,4}[-.\s]?\d{4}/.test(text)) {
    findings.push("phone");
  }
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) {
    findings.push("email");
  }
  if (/(자살|죽고\s*싶|자해|타해)/.test(text)) {
    findings.push("crisis");
  }
  return {
    findings,
    blocked:
      findings.includes("phone") ||
      findings.includes("email") ||
      findings.includes("crisis"),
  };
}

/** v1 policy: never insert a row when blocked. */
export function shouldPersistSharedReflection(safety: SafetyScanResult): boolean {
  return !safety.blocked;
}

export const SAFETY_BLOCKED = "SAFETY_BLOCKED" as const;

export const SAFETY_BLOCKED_MESSAGE =
  "개인정보 또는 위험 표현이 감지되어 공개되지 않았습니다. 내용을 수정해 주세요.";

/**
 * Story Mirror — Safety Scrub
 *
 * Story Mirror 전용 위기·개인정보 감지.
 * 기존 together-safety.ts를 확장하여 Story Mirror에 맞춤.
 */

const CRISIS_KEYWORDS = [
  "자살", "죽고싶", "죽고 싶", "자해", "타해",
  "극단적", "목숨", "끝내고 싶", "살기 싶",
  "죽어버리", "죽을 것 같", "세상이 끝", "의미 없",
  "떠나고 싶", "포기하고 싶",
];

const FORBIDDEN_PATTERNS = [
  /하나님.*원하/,
  /하나님.*말씀/,
  /하나님.*요구/,
  /당신은.*사람/,
  /배워야/,
  /해결/,
  /반드시/,
  /소명.*이/,
  /명령/,
  /판정/,
  /진단/,
  /상담.*필요/,
  /의료.*조언/,
];

export type SafetyResult = {
  hasCrisis: boolean;
  hasPII: boolean;
  findings: string[];
};

/**
 * 사용자 기록에서 위기·PII 키워드를 감지한다.
 */
export function scanEntrySafety(text: string): SafetyResult {
  const findings: string[] = [];

  for (const kw of CRISIS_KEYWORDS) {
    if (text.includes(kw)) {
      findings.push(`crisis:${kw}`);
    }
  }

  // PII 감지
  if (/(010|011|016|017|018|019)[-.\s]?\d{3,4}[-.\s]?\d{4}/.test(text)) {
    findings.push("pii:phone");
  }
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) {
    findings.push("pii:email");
  }

  return {
    hasCrisis: findings.some((f) => f.startsWith("crisis:")),
    hasPII: findings.some((f) => f.startsWith("pii:")),
    findings,
  };
}

/**
 * 매칭 설명에서 금지 표현을 필터링한다.
 */
export function filterForbiddenExpressions(text: string): { filtered: string; hadForbidden: boolean } {
  let hadForbidden = false;
  let result = text;

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(result)) {
      hadForbidden = true;
      result = result.replace(pattern, "");
    }
  }

  // 연속 공백 정리
  result = result.replace(/\s{2,}/g, " ").trim();

  return { filtered: result, hadForbidden };
}

/**
 * 위기 기록이 포함된 기록을 매칭 입력에서 제외해야 하는지 판단한다.
 */
export function shouldExcludeFromMatching(text: string): boolean {
  const safety = scanEntrySafety(text);
  return safety.hasCrisis;
}

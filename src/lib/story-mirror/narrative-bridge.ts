/**
 * Story Mirror — Narrative Bridge (Template-based)
 *
 * 매칭 결과를 한국어 설명으로 변환한다.
 * LLM을 사용하지 않고, 결정적 템플릿으로 생성한다.
 */

import { filterForbiddenExpressions } from "./safety";

/**
 * 매칭 결과를 사용자에게 보여줄 설명을 생성한다.
 * 금지 표현 필터링을 포함한다.
 */
export function buildNarrativeBridge(
  cardName: string,
  _workTitle: string,
  matchedThemes: string[],
  matchedEmotions: string[],
  _matchedSituations: string[],
  entryCount: number,
): string {
  const theme = matchedThemes[0];
  const emotion = matchedEmotions[0];

  const qualifier =
    entryCount <= 1
      ? "단일 기록 기반의 잠정 연결입니다. "
      : "";

  if (theme && emotion) {
    return `${qualifier}최근 기록에서 '${theme}'과 '${emotion}'이 함께 나타납니다. ${cardName}의 이야기에서도 이 긴장이 중요하게 다뤄집니다.`;
  }

  if (theme) {
    return `${qualifier}최근 기록에서 '${theme}'이 반복됩니다. ${_workTitle}의 ${cardName}는 이 주제와 관련된 이야기를 담고 있습니다.`;
  }

  if (emotion) {
    return `${qualifier}'${emotion}'이라는 마음이 여러 번 나타납니다. ${cardName}도 비슷한 마음의 흐름을 경험합니다.`;
  }

  const raw = `${qualifier}...`;
  const { filtered } = filterForbiddenExpressions(raw);
  return filtered;
}



/**
 * 상세 페이지에서 사용할 "당신과 닮은 점" 설명 생성
 */
export function buildSimilaritySection(
  matchedThemes: string[],
  matchedEmotions: string[],
  matchedSituations: string[],
): string {
  const parts: string[] = [];
  if (matchedThemes.length > 0) {
    parts.push(`주제(${matchedThemes.join(", ")})`);
  }
  if (matchedEmotions.length > 0) {
    parts.push(`감정(${matchedEmotions.join(", ")})`);
  }
  if (matchedSituations.length > 0) {
    parts.push(`상황(${matchedSituations.join(", ")})`);
  }

  if (parts.length === 0) return "";

  return `당신의 기록에서 나타나는 ${parts.join(", ")}가 이 이야기와 겹칩니다.`;
}

/**
 * 익명 사용자 기본 이름 — userId 해시로 결정적 선택 (기기마다 안정적).
 * displayName이 비어 있으면 이 이름을 fallback으로 표시한다.
 * 설정에서 이름을 정하면 displayName에 저장되고 이 fallback은 더 이상 안 쓰인다.
 */
const ANON_NAMES = [
  "가가", "나나", "다다", "라라", "마마", "바바", "사사", "아아",
  "자자", "차차", "카카", "타타", "파파", "하하", "모모", "미미",
  "보보", "키키", "토토", "두두", "쿠키", "초코", "몽이", "별이",
  "솜이", "보리", "달래", "반짝",
] as const;

export function anonName(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return ANON_NAMES[Math.abs(hash) % ANON_NAMES.length];
}

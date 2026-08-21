import { describe, it, expect } from "bun:test";
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  buildDailyScriptureEmailContent,
} from "../src/lib/mail";

describe("unsubscribe token", () => {
  it("generates and verifies a valid token", () => {
    const userId = "user_123";
    const token = generateUnsubscribeToken(userId);
    expect(token).toContain(".");
    expect(verifyUnsubscribeToken(token)).toBe(userId);
  });

  it("rejects invalid token", () => {
    expect(verifyUnsubscribeToken("invalid")).toBeNull();
    expect(verifyUnsubscribeToken("user_123.wronghmac")).toBeNull();
    expect(verifyUnsubscribeToken("")).toBeNull();
  });

  it("rejects tampered token", () => {
    const token = generateUnsubscribeToken("user_123");
    const [id, hmac] = token.split(".");
    const tampered = `${id}.${hmac.slice(0, -1)}x`;
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });

  it("generates different tokens for different users", () => {
    const t1 = generateUnsubscribeToken("user_a");
    const t2 = generateUnsubscribeToken("user_b");
    expect(t1).not.toBe(t2);
    expect(verifyUnsubscribeToken(t1)).toBe("user_a");
    expect(verifyUnsubscribeToken(t2)).toBe("user_b");
  });
});

describe("GATE-4 일일 성구 이메일 계약", () => {
  const base = {
    userId: "user_1",
    email: "a@test.local",
    name: "홍길동",
    path: "random" as const,
    display: "시편 42:1-5",
    text: "하나님이여 내 영혼이 주를 사모하나이다",
    background: "시편 42편은 코라 자손의 시입니다.",
  };

  it("CTA는 /today (인증 0회 목적지), 기록 폼 직행 금지 (C6·GATE-4)", () => {
    const { text, html } = buildDailyScriptureEmailContent(base, "https://eobom.ponslink.com", "t");
    expect(text).toContain("https://eobom.ponslink.com/today");
    expect(text).not.toContain("/entries/new");
    expect(html).toContain("https://eobom.ponslink.com/today");
    expect(html).not.toContain("/entries/new");
    expect(html).toContain("오늘의 카드에서 만나기");
  });

  it("개인 원문 미포함 — metaNote는 메타 카피만 (GATE-4)", () => {
    const { text, html } = buildDailyScriptureEmailContent(
      { ...base, path: "ai", metaNote: "최근 남긴 기록이 오늘 카드로 이어졌습니다." },
      "https://eobom.ponslink.com",
      "t",
    );
    expect(text).toContain("최근 남긴 기록이 오늘 카드로 이어졌습니다");
  });

  it("metaNote 타입 계약 — 원문 할당은 컴파일 차단 (QA-3)", () => {
    // 아래 할당이 타입 체크를 통과하면 tsc가 실패한다 (GATE-4 리터럴 유니온 계약).
    // @ts-expect-error DailyEmailMetaNote에 원문 문자열은 할당 불가
    const _bad: import("../src/lib/mail").DailyEmailMetaNote = "기록 검증용 비밀 문장";
    void _bad;
    expect(true).toBe(true);
  });

  it("랜덤 경로는 theme/why 미포함, AI 경로만 포함 (C7)", () => {
    const random = buildDailyScriptureEmailContent(base, "https://x", "t");
    expect(random.text).not.toContain("최근 기록에서");
    const ai = buildDailyScriptureEmailContent(
      { ...base, path: "ai", theme: "기다림", why: "최근 기록의 기다림이 반복되어 선택했습니다." },
      "https://x",
      "t",
    );
    expect(ai.text).toContain("최근 기록에서 ‘기다림’의 결이");
    expect(ai.text).toContain("— 왜 이 본문인지 —");
  });

  it("metaNote 없으면 개인 요소 없음 — 기록 없는 유저 카피", () => {
    const { text } = buildDailyScriptureEmailContent(base, "https://x", "t");
    expect(text).toContain("기록을 남기면 내일부터 이 카드가 당신을 위해 달라집니다");
    expect(text).not.toContain("이어졌습니다");
  });
});

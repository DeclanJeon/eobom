import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

/**
 * 조용한 안전망 (DESIGN.md "Continuity & identity policy") — 정적 contract.
 * 유저에게 보이는 것: 3번째 기록 시점 단 한 번의 구글 연결 카드.
 * 유저에게 보이지 않는 것: Google 로그인 시 익명 User로의 자동 승계.
 */

describe("Backup prompt (조용한 안전망) contract", () => {
  const prompt = readFileSync("src/components/backup-prompt.tsx", "utf8");
  const dismissRoute = readFileSync(
    "src/app/api/me/backup-prompt/dismiss/route.ts",
    "utf8",
  );
  const todayPage = readFileSync("src/app/today/page.tsx", "utf8");
  const schema = readFileSync("prisma/schema.prisma", "utf8");

  test("3번째 기록 조건 — count >= 3 && 익명 && 미해제일 때만 노출된다", () => {
    // trigger는 시간 기반이 아니라 기록 수 기반 (정책 명세).
    expect(todayPage).toContain("entryCount >= 3");
    expect(todayPage).toMatch(/!userRow\?\.email/);
    expect(todayPage).toMatch(/!userRow\?\.backupPromptDismissedAt/);
  });

  test("해제는 서버에 기록되어 다시 묻지 않는다", () => {
    expect(dismissRoute).toContain("backupPromptDismissedAt");
    // 인증된 유저만 해제할 수 있다.
    expect(dismissRoute).toContain("requireApiUser");
  });

  test("스키마에 backupPromptDismissedAt 필드가 존재한다", () => {
    expect(schema).toMatch(/backupPromptDismissedAt\s+DateTime\?/);
  });

  test("프롬프트는 회원가입 언어를 쓰지 않는다 (No signup funnel)", () => {
    expect(prompt).not.toContain("회원가입");
    expect(prompt).not.toContain("가입하기");
    expect(prompt).toContain("구글 계정 연결하기");
    expect(prompt).toContain("나중에");
  });

  test("연결은 기존 attach-in-place 흐름을 사용한다 (새 parallel 계정 금지)", () => {
    // BackupPrompt의 구글 링크는 next-auth signin이며 설정의 수동 연결과
    // 동일한 attachGoogleAccountToUser 흐름을 탄다.
    expect(prompt).toContain("/api/auth/signin/google");
  });
});

describe("Auto-succession (자동 승계) contract", () => {
  const accountLink = readFileSync("src/lib/account-link.ts", "utf8");
  const auth = readFileSync("src/lib/auth.ts", "utf8");

  test("signIn 콜백에서 자동 승계를 시도한다", () => {
    expect(auth).toContain("succeedAnonymousUserToGoogle");
  });

  test("승계는 device cookie의 익명 User를 대상으로만 동작한다", () => {
    expect(accountLink).toContain("DEVICE_COOKIE");
    expect(accountLink).toMatch(/succeedAnonymousUserToGoogle/);
  });

  test("안전 가드 — 이미 연결된 계정/이메일 충돌 시 승계하지 않는다", () => {
    // 기존 연결 Account가 있으면 승계 금지 (email_in_use 정책이 담당).
    expect(accountLink).toMatch(/existingAccount[\s\S]{0,200}return false/);
    // 같은 이메일의 다른 User가 있으면 승계 금지.
    expect(accountLink).toMatch(/emailOwner[\s\S]{0,200}return false/);
  });

  test("승계는 attach-in-place — 데이터 이전이 아니라 identity 부착이다", () => {
    // user.update(email 세팅) + account.create 만 수행한다.
    // 다른 테이블(reflectionEntry 등)로의 카피가 있으면 병합이 아니라 실수다.
    const fn = accountLink.slice(accountLink.indexOf("succeedAnonymousUserToGoogle"));
    expect(fn).not.toContain("reflectionEntry");
    expect(fn).toContain("account.create");
  });
});

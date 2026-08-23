import { describe, expect, test, mock } from "bun:test";
import { renderToReadableStream } from "react-dom/server";
import type { ReactNode } from "react";

// GATE-2: 게스트 /today — 인증 없이 전역 말씀 카드만, 개인 데이터 조회 0회.
// GuestTodayView는 session·db를 import하지 않는 독립 컴포넌트 —
// 페이지/세션 mock 충돌 없이 분기 결과를 직접 검증한다.
mock.module("@/components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}));
mock.module("@/components/start-recording-button", () => ({
  StartRecordingButton: ({ label }: { label: string }) => <button>{label}</button>,
}));

const { GuestTodayView } = await import("../src/components/today/guest-view");
const { selectGlobalScripture } = await import("../src/lib/daily-scripture");

async function renderGuest(now: Date) {
  const stream = await renderToReadableStream(<GuestTodayView now={now} />);
  let html = "";
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
  }
  return html;
}

describe("GATE-2 /today 게스트 경로", () => {
  test("비로그인 렌더: 전역 말씀 카드 + 로그인 CTA (인증 요구 0회)", async () => {
    const html = await renderGuest(new Date("2026-08-21T03:00:00.000Z"));
    expect(html).toContain("오늘 함께 읽을 말씀");
    expect(html).toContain("기록으로 잇기");
    expect(html).toContain("chip-gold"); // 성구 칩
    // 개인 데이터 미노출: 인사말·기록 목록·회고·타임캡슐·결단 없음
    expect(html).not.toContain("순례자");
    expect(html).not.toContain("최근 기록");
    expect(html).not.toContain("최근 회고");
    expect(html).not.toContain("과거의 오늘");
    expect(html).not.toContain("열린 결단");
  });

  test("전역 말씀은 KST 날짜만으로 결정 — 같은 날 모든 사용자 동일 (C2)", () => {
    const a = selectGlobalScripture(new Date("2026-08-21T03:00:00.000Z"));
    const b = selectGlobalScripture(new Date("2026-08-21T12:00:00.000Z"));
    expect(a.display).toBe(b.display);
    // 다른 날은 다름 (재탭 이유)
    const c = selectGlobalScripture(new Date("2026-08-22T03:00:00.000Z"));
    expect(c.display).not.toBe(a.display);
  });
});

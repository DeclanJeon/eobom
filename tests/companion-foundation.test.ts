import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("Companion foundation contract", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const service = readFileSync("src/lib/companions.ts", "utf8");
  const profileRoute = readFileSync("src/app/api/companions/profile/route.ts", "utf8");
  const matchRoute = readFileSync("src/app/api/companions/match/route.ts", "utf8");
  const panel = readFileSync("src/components/companion-panel.tsx", "utf8");
  const decisionRoute = readFileSync("src/app/api/companions/candidates/[id]/decision/route.ts", "utf8");
  const safetyRoute = readFileSync("src/app/api/companions/safety/route.ts", "utf8");
  const messageRoute = readFileSync("src/app/api/companions/connections/[id]/messages/route.ts", "utf8");
  const connectionsPage = readFileSync("src/app/together/companions/connections/page.tsx", "utf8");
  const settingsPage = readFileSync("src/app/me/settings/page.tsx", "utf8");

  test("companion consent is separate and opt-in by default", () => {
    expect(schema).toMatch(/companionConsent\s+Boolean\s+@default\(false\)/);
    expect(schema).toMatch(/enabled\s+Boolean\s+@default\(false\)/);
    expect(schema).toMatch(/acceptsRequests\s+Boolean\s+@default\(false\)/);
    expect(profileRoute).toContain("companionConsent");
  });

  test("candidate generation is bounded and privacy-preserving", () => {
    expect(service).toContain("MAX_CANDIDATES = 3");
    expect(service).toContain("if (!requester?.companionConsent) return []");
    expect(service).toContain("enabled: true");
    expect(service).toContain("acceptsRequests: true");
    expect(service).not.toContain("reflectionBody");
    expect(service).not.toContain("email:");
    expect(matchRoute).toContain("requireApiUser");
  });

  test("UI explains the voluntary and limited nature of matching", () => {
    expect(panel).toContain("별도");
    expect(panel).toContain("도움이 될 사람 찾아보기");
    expect(panel).toContain("별도 동의 없이는");
    expect(panel).toContain("나중에 보기");
    expect(panel).toContain("이번에는 아니에요");
  });

  test("companion controls are reachable from account settings", () => {
    expect(settingsPage).toContain("CompanionPanel");
    expect(settingsPage).toContain("기존 AI 개인화 동의와 별개");
  });

  test("mutual consent and safety endpoints are scoped and explicit", () => {
    expect(schema).toContain("model CompanionDecision");
    expect(schema).toContain("model CompanionConnection");
    expect(schema).toContain("model CompanionSafetyEvent");
    expect(decisionRoute).toContain("requireApiUser");
    expect(safetyRoute).toContain("requireApiUser");
    expect(service).toContain("bothAccepted");
    expect(service).toContain('type: "block"');
    expect(messageRoute).toContain("requireApiUser");
    expect(connectionsPage).toContain("첫 인사는 자동으로 보내지 않습니다");
  });

  test("high-volume companion actions have daily caps", () => {
    expect(matchRoute).toContain("companions:match:daily");
    expect(decisionRoute).toContain("companions:decision:daily");
    expect(safetyRoute).toContain("companions:safety:daily");
    expect(messageRoute).toContain("companions:messages:daily");
  });
});

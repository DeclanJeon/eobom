import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "../src/lib/db";
import { getLatestReviewStoryMirror } from "../src/lib/story-mirror/db";
import type { StructuredReview, ReviewObservation } from "../src/lib/mimo";

const EMAIL = `story-mirror-seed-${Date.now()}@example.com`;

function obs(key: string, title: string, body: string): ReviewObservation {
  return { key, title, body, confidence: "high", evidence: [] };
}

const base: StructuredReview = {
  oneSentence: "되풀이되는 두려움을 마주한 한 달이었습니다.",
  themes: [obs("t1", "두려움", "앞을 향한 불안이 자주 나타났다.")],
  emotions: [obs("e1", "불안", "시험 기간마다 위축되었다.")],
  questions: [obs("q1", "왜 나는 자꾸 물러나는가", "")],
  storyConnections: [
    {
      story: "모세 (출애굽기)",
      source: "성경",
      connection: "호수 앞에서 두려움에 멈춰 선 모습이 닮았다.",
      differentPerspective: "모세는 떨림 속에서도 보냄을 받았다.",
    },
    {
      story: "엘리야 (열왕기상 19)",
      source: "성경",
      connection: "광야에서 위축되어 숨었던 마음이 닮았다.",
    },
  ],
  scriptureConnections: [],
  scriptureReadings: [],
  actionFlow: [],
  changesOrUnknown: "",
  rereadEntries: [],
  rereadScriptures: [],
  communityQuestions: [],
  nextSteps: [],
  prayerPrompts: [],
  smallPractices: [],
  limitations: "",
  disclaimer: "",
};

const themesOnly: StructuredReview = { ...base, storyConnections: [] };
const empty: StructuredReview = {
  ...base,
  oneSentence: "",
  themes: [],
  emotions: [],
  questions: [],
  storyConnections: [],
};

describe("getLatestReviewStoryMirror", () => {
  let userId: string;

  beforeAll(async () => {
    const user = await db.user.create({
      data: { email: EMAIL, name: "seed-user" },
    });
    userId = user.id;
    await db.reviewReport.create({
      data: {
        userId,
        periodStart: new Date("2026-07-01"),
        periodEnd: new Date("2026-07-31"),
        summary: base.oneSentence,
        structuredOutput: JSON.stringify(base),
      },
    });
  });

  afterAll(async () => {
    await db.reviewReport.deleteMany({ where: { userId } });
    await db.user.deleteMany({ where: { email: EMAIL } });
  });

  it("returns storyConnections + seed when present", async () => {
    const r = await getLatestReviewStoryMirror(userId);
    expect(r).not.toBeNull();
    expect(r!.storyConnections).toHaveLength(2);
    expect(r!.storyConnections[0].story).toBe("모세 (출애굽기)");
    expect(r!.seed).toContain("두려움");
    expect(r!.seed.length).toBeGreaterThan(0);
    expect(r!.seed.length).toBeLessThanOrEqual(4000);
  });

  it("returns null when the user has no review", async () => {
    const orphan = await db.user.create({
      data: { email: `orphan-${Date.now()}@example.com`, name: "o" },
    });
    const r = await getLatestReviewStoryMirror(orphan.id);
    expect(r).toBeNull();
    await db.user.deleteMany({ where: { id: orphan.id } });
  });

  it("returns seed-only (no storyConnections) when themes exist", async () => {
    const u = await db.user.create({
      data: { email: `themes-${Date.now()}@example.com`, name: "t" },
    });
    await db.reviewReport.create({
      data: {
        userId: u.id,
        periodStart: new Date("2026-06-01"),
        periodEnd: new Date("2026-06-30"),
        summary: themesOnly.oneSentence,
        structuredOutput: JSON.stringify(themesOnly),
      },
    });
    const r = await getLatestReviewStoryMirror(u.id);
    expect(r).not.toBeNull();
    expect(r!.storyConnections).toHaveLength(0);
    expect(r!.seed).toContain("두려움");
    await db.reviewReport.deleteMany({ where: { userId: u.id } });
    await db.user.deleteMany({ where: { id: u.id } });
  });

  it("returns null when the review has no usable content", async () => {
    const u = await db.user.create({
      data: { email: `empty-${Date.now()}@example.com`, name: "e" },
    });
    await db.reviewReport.create({
      data: {
        userId: u.id,
        periodStart: new Date("2026-05-01"),
        periodEnd: new Date("2026-05-31"),
        summary: "",
        structuredOutput: JSON.stringify(empty),
      },
    });
    const r = await getLatestReviewStoryMirror(u.id);
    expect(r).toBeNull();
    await db.reviewReport.deleteMany({ where: { userId: u.id } });
    await db.user.deleteMany({ where: { id: u.id } });
  });
});

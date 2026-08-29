import { describe, expect, test } from "bun:test";
import { db } from "@/lib/db";
import {
  generateCompanionCandidates,
  recordCompanionSafetyEvent,
  sendCompanionMessage,
  runCompanionMatch,
  upsertCompanionProfile,
} from "@/lib/companions";

describe("companion behavioral safeguards", () => {
  test("does not generate candidates without explicit consent", async () => {
    const user = await db.user.create({ data: { email: `companion-${crypto.randomUUID()}@test.local` } });
    expect(await generateCompanionCandidates(user.id)).toEqual([]);
  });

  test("records a blocked match run without consent", async () => {
    const user = await db.user.create({ data: { email: `companion-${crypto.randomUUID()}@test.local` } });
    const result = await runCompanionMatch(user.id);
    expect(result.status).toBe("blocked");
    expect(await db.companionMatchRun.count({ where: { id: result.runId, status: "blocked" } })).toBe(1);
  });

  test("rejects self-targeted safety actions", async () => {
    const user = await db.user.create({ data: { email: `companion-${crypto.randomUUID()}@test.local` } });
    await expect(recordCompanionSafetyEvent(user.id, { targetUserId: user.id, type: "block" })).rejects.toThrow();
  });

  test("does not send messages on an unowned connection", async () => {
    const user = await db.user.create({ data: { email: `companion-${crypto.randomUUID()}@test.local` } });
    await expect(sendCompanionMessage(user.id, "missing-connection", "안녕하세요")).rejects.toThrow();
  });

  test("rejects contact details in public profile fields", async () => {
    const user = await db.user.create({ data: { email: `companion-${crypto.randomUUID()}@test.local` } });
    await expect(upsertCompanionProfile(user.id, {
      topicTags: ["https://example.com"],
    })).rejects.toThrow();
  });

  test("does not publish crisis or sensitive profile signals", async () => {
    const user = await db.user.create({ data: { email: `companion-${crypto.randomUUID()}@test.local` } });
    const profile = await upsertCompanionProfile(user.id, {
      topicTags: ["기도", "학대"],
      helpModes: ["들어주기", "응급"],
    });
    expect(profile.topicTags).toContain("학대");
    const service = await import("@/lib/companions");
    expect(service.serializeCompanionProfile(profile).topicTags).toEqual(["기도"]);
    expect(service.serializeCompanionProfile(profile).helpModes).toEqual(["들어주기"]);
  });
});

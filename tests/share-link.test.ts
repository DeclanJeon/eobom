import { describe, expect, test } from "bun:test";
import { db } from "../src/lib/db";
import {
  createShareLink,
  listEntryShareLinks,
  resolveShareLink,
  revokeShareLink,
} from "../src/lib/share-link";

async function cleanup(userId: string) {
  await db.entryShareLink.deleteMany({ where: { userId } });
  await db.reflectionEntry.deleteMany({ where: { userId } });
  await db.user.deleteMany({ where: { id: userId } });
}

describe("share link service (Journey F MVP)", () => {
  test("creates a link with sentence + refs only and resolves it", async () => {
    const user = await db.user.create({ data: {} });
    try {
      const entry = await db.reflectionEntry.create({
        data: {
          userId: user.id,
          entryDate: new Date(),
          reflectionBody: "아주 사적인 원문 기록입니다. 공유되면 안 돼요.",
          scriptureRefs: "[]",
        },
      });

      const link = await createShareLink({
        userId: user.id,
        entryId: entry.id,
        selectedSentence: "오늘의 다짐 한 문장",
        scriptureRefs: ["시편 23:1"],
        expiresInDays: 7,
      });

      const resolved = await resolveShareLink(link.token);
      expect(resolved).toEqual({
        selectedSentence: "오늘의 다짐 한 문장",
        scriptureRefs: ["시편 23:1"],
      });
    } finally {
      await cleanup(user.id);
    }
  });

  test("rejects other users' entries (IDOR)", async () => {
    const owner = await db.user.create({ data: {} });
    const attacker = await db.user.create({ data: {} });
    try {
      const entry = await db.reflectionEntry.create({
        data: {
          userId: owner.id,
          entryDate: new Date(),
          reflectionBody: "소유자 기록",
          scriptureRefs: "[]",
        },
      });
      expect(
        createShareLink({
          userId: attacker.id,
          entryId: entry.id,
          selectedSentence: "훔친 문장",
        }),
      ).rejects.toThrow("찾을 수 없습니다");
    } finally {
      await cleanup(owner.id);
      await cleanup(attacker.id);
    }
  });

  test("expired links stop resolving", async () => {
    const user = await db.user.create({ data: {} });
    try {
      const entry = await db.reflectionEntry.create({
        data: {
          userId: user.id,
          entryDate: new Date(),
          reflectionBody: "만료 테스트",
          scriptureRefs: "[]",
        },
      });
      const link = await createShareLink({
        userId: user.id,
        entryId: entry.id,
        selectedSentence: "곧 만료",
        expiresInDays: 7,
      });
      const afterExpiry = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
      await expect(resolveShareLink(link.token)).resolves.not.toBeNull();
      await expect(resolveShareLink(link.token, afterExpiry)).resolves.toBeNull();
    } finally {
      await cleanup(user.id);
    }
  });

  test("revoked links stop resolving and are scoped to the owner", async () => {
    const user = await db.user.create({ data: {} });
    const stranger = await db.user.create({ data: {} });
    try {
      const entry = await db.reflectionEntry.create({
        data: {
          userId: user.id,
          entryDate: new Date(),
          reflectionBody: "철회 테스트",
          scriptureRefs: "[]",
        },
      });
      const link = await createShareLink({
        userId: user.id,
        entryId: entry.id,
        selectedSentence: "닫을 문장",
      });

      await expect(revokeShareLink(stranger.id, link.id)).resolves.toBe(false);
      await expect(resolveShareLink(link.token)).resolves.not.toBeNull();

      await expect(revokeShareLink(user.id, link.id)).resolves.toBe(true);
      await expect(resolveShareLink(link.token)).resolves.toBeNull();
      await expect(listEntryShareLinks(user.id, entry.id)).resolves.toHaveLength(1);
    } finally {
      await cleanup(user.id);
      await cleanup(stranger.id);
    }
  });
});

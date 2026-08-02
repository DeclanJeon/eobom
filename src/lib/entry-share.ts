import { db } from "@/lib/db";
import {
  SAFETY_BLOCKED,
  scanSharedReflectionSafety,
  shouldPersistSharedReflection,
} from "@/lib/together-safety";
import { sanitizeTopicTags } from "@/lib/together-tags";
import { getUserPreferenceFlags } from "@/lib/user-preferences";
import { parseJsonArray, toJsonArray } from "@/lib/utils";
export type ShareVisibility = "public" | "private";

export function normalizeShareVisibility(value: unknown): ShareVisibility {
  return value === "private" ? "private" : "public";
}

/** Turn journal markdown/plain text into a calm anonymous share body. */
export function buildPublicBodyFromEntry(input: {
  title?: string | null;
  reflectionBody: string;
}): string {
  const plain = input.reflectionBody
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length >= 20) return plain.slice(0, 2000);

  const title = input.title?.trim();
  if (title && plain) {
    const merged = `${title} — ${plain}`.trim();
    return merged.slice(0, 2000);
  }
  if (title && title.length >= 20) return title.slice(0, 2000);
  return plain;
}

export type EntryShareSyncResult =
  | { status: "private" }
  | { status: "published"; sharedReflectionId: string }
  | { status: "updated"; sharedReflectionId: string }
  | { status: "withdrawn" }
  | { status: "skipped_community_off" }
  | { status: "blocked"; code: typeof SAFETY_BLOCKED; findings: string[] }
  | { status: "too_short" };

async function withdrawLinkedShares(userId: string, entryId: string) {
  const result = await db.sharedReflection.updateMany({
    where: {
      ownerUserId: userId,
      sourceEntryId: entryId,
      deletedAt: null,
      withdrawnAt: null,
    },
    data: { withdrawnAt: new Date(), visibility: "private" },
  });
  return result.count;
}

/**
 * Keep the anonymous Together copy in sync with the entry's shareVisibility.
 * Original journal text stays private; only a scrubbed publicBody copy is exposed.
 */
export async function syncEntryShare(
  userId: string,
  entryId: string,
): Promise<EntryShareSyncResult> {
  const entry = await db.reflectionEntry.findFirst({
    where: { id: entryId, userId, deletedAt: null },
  });
  if (!entry) throw new Error("기록을 찾을 수 없습니다.");

  const shareVisibility = normalizeShareVisibility(entry.shareVisibility);
  if (shareVisibility === "private") {
    const count = await withdrawLinkedShares(userId, entryId);
    return count > 0 ? { status: "withdrawn" } : { status: "private" };
  }

  const flags = await getUserPreferenceFlags(userId);
  if (!flags.communityEnabled) {
    return { status: "skipped_community_off" };
  }

  const publicBody = buildPublicBodyFromEntry({
    title: entry.title,
    reflectionBody: entry.reflectionBody,
  });
  if (publicBody.trim().length < 20) {
    return { status: "too_short" };
  }

  const safety = scanSharedReflectionSafety(publicBody);
  if (!shouldPersistSharedReflection(safety)) {
    await withdrawLinkedShares(userId, entryId);
    return {
      status: "blocked",
      code: SAFETY_BLOCKED,
      findings: safety.findings,
    };
  }

  let scriptureRefsFromBindings: string[] = [];
  try {
    const parsed = JSON.parse(entry.scriptureBindings || "[]") as unknown;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (!item || typeof item !== "object") continue;
        if (!("display" in item)) continue;
        const display = item.display;
        if (typeof display === "string" && display.trim()) {
          scriptureRefsFromBindings.push(display.trim());
        }
        if (scriptureRefsFromBindings.length >= 5) break;
      }
    }
  } catch {
    scriptureRefsFromBindings = [];
  }
  const scriptureRefs =
    scriptureRefsFromBindings.length > 0
      ? scriptureRefsFromBindings
      : parseJsonArray(entry.scriptureRefs).slice(0, 5);
  const topicTags = sanitizeTopicTags(parseJsonArray(entry.tags), 5);
  const existing = await db.sharedReflection.findFirst({
    where: {
      ownerUserId: userId,
      sourceEntryId: entryId,
      deletedAt: null,
    },
    orderBy: { publishedAt: "desc" },
  });

  if (existing) {
    const updated = await db.sharedReflection.update({
      where: { id: existing.id },
      data: {
        publicBody,
        scriptureRefs: toJsonArray(scriptureRefs),
        topicTags: toJsonArray(topicTags),
        pseudonym: existing.pseudonym?.trim() || "익명의 순례자",
        safetyScanResult: JSON.stringify(safety),
        visibility: "public",
        withdrawnAt: null,
      },
    });
    return { status: "updated", sharedReflectionId: updated.id };
  }

  const created = await db.sharedReflection.create({
    data: {
      ownerUserId: userId,
      sourceEntryId: entryId,
      publicBody,
      imageUrls: toJsonArray([]),
      scriptureRefs: toJsonArray(scriptureRefs),
      topicTags: toJsonArray(topicTags),
      pseudonym: "익명의 순례자",
      safetyScanResult: JSON.stringify(safety),
      visibility: "public",
    },
  });
  return { status: "published", sharedReflectionId: created.id };
}

export async function withdrawSharesForDeletedEntry(userId: string, entryId: string) {
  await withdrawLinkedShares(userId, entryId);
}

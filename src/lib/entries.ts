import { db } from "@/lib/db";
import type { ScriptureBinding } from "@/lib/bible";
import {
  normalizeShareVisibility,
  syncEntryShare,
  withdrawSharesForDeletedEntry,
  type ShareVisibility,
} from "@/lib/entry-share";
import { parseJsonArray, toJsonArray } from "@/lib/utils";

export type EntryInput = {
  entryDate?: string;
  title?: string | null;
  scriptureRefs?: string[];
  scriptureExcerpt?: string | null;
  scriptureBindings?: ScriptureBinding[];
  reflectionBody: string;
  gratitude?: string | null;
  question?: string | null;
  prayer?: string | null;
  actionStep?: string | null;
  emotions?: string[];
  tags?: string[];
  templateType?: string;
  privateNote?: string | null;
  cellShareSummary?: string | null;
  shareVisibility?: ShareVisibility | string | null;
};

function normalizeBindings(input?: ScriptureBinding[] | null): ScriptureBinding[] {
  if (!input?.length) return [];
  return input
    .filter(
      (b) =>
        b &&
        typeof b.code === "string" &&
        Number.isInteger(b.chapter) &&
        Number.isInteger(b.startVerse) &&
        Number.isInteger(b.endVerse) &&
        b.endVerse >= b.startVerse,
    )
    .slice(0, 5)
    .map((b) => ({
      code: b.code.toUpperCase(),
      chapter: b.chapter,
      startVerse: b.startVerse,
      endVerse: b.endVerse,
      display: b.display || `${b.code} ${b.chapter}:${b.startVerse}`,
      excerpt: b.excerpt,
      translation: b.translation || "ko-open-bible",
      slug:
        b.slug ||
        (b.startVerse === b.endVerse
          ? `${b.code}-${b.chapter}-${b.startVerse}`
          : `${b.code}-${b.chapter}-${b.startVerse}-${b.endVerse}`),
    }));
}

export function parseBindings(raw: string | null | undefined): ScriptureBinding[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeBindings(parsed) : [];
  } catch {
    return [];
  }
}

export function validateEntryInput(input: EntryInput): string | null {
  const body = input.reflectionBody?.trim();
  if (!body) return "묵상 본문을 입력해 주세요.";
  const hasTitle = Boolean(input.title?.trim());
  const hasBindings = (input.scriptureBindings?.length ?? 0) > 0;
  const hasScripture = (input.scriptureRefs?.length ?? 0) > 0;
  if (!hasTitle && !hasBindings && !hasScripture) {
    return "성구 또는 제목 중 하나는 필요합니다.";
  }
  return null;
}

function scriptureFields(input: EntryInput) {
  const bindings = normalizeBindings(input.scriptureBindings);
  const refs =
    bindings.length > 0
      ? bindings.map((b) => b.display)
      : (input.scriptureRefs ?? []).map((s) => s.trim()).filter(Boolean);
  const excerpt =
    bindings[0]?.excerpt?.trim() ||
    input.scriptureExcerpt?.trim() ||
    null;
  return {
    scriptureBindings: JSON.stringify(bindings),
    scriptureRefs: toJsonArray(refs),
    scriptureExcerpt: excerpt,
  };
}

export function serializeEntry(entry: {
  id: string;
  userId: string;
  entryDate: Date;
  title: string | null;
  scriptureRefs: string;
  scriptureExcerpt: string | null;
  scriptureBindings?: string | null;
  reflectionBody: string;
  gratitude: string | null;
  question: string | null;
  prayer: string | null;
  actionStep: string | null;
  emotions: string;
  tags: string;
  templateType: string;
  privateNote: string | null;
  cellShareSummary: string | null;
  shareVisibility?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  const scriptureBindings = parseBindings(entry.scriptureBindings);
  const scriptureRefs = parseJsonArray(entry.scriptureRefs);
  return {
    ...entry,
    shareVisibility: normalizeShareVisibility(entry.shareVisibility),
    scriptureRefs,
    scriptureBindings,
    emotions: parseJsonArray(entry.emotions),
    tags: parseJsonArray(entry.tags),
  };
}

export async function createEntry(userId: string, input: EntryInput) {
  const error = validateEntryInput(input);
  if (error) throw new Error(error);
  const scripture = scriptureFields(input);

  const entry = await db.reflectionEntry.create({
    data: {
      userId,
      entryDate: input.entryDate ? new Date(input.entryDate) : new Date(),
      title: input.title?.trim() || null,
      ...scripture,
      reflectionBody: input.reflectionBody.trim(),
      gratitude: input.gratitude?.trim() || null,
      question: input.question?.trim() || null,
      prayer: input.prayer?.trim() || null,
      actionStep: input.actionStep?.trim() || null,
      emotions: toJsonArray(input.emotions),
      tags: toJsonArray(input.tags),
      templateType: input.templateType || "free",
      privateNote: input.privateNote?.trim() || null,
      cellShareSummary: input.cellShareSummary?.trim() || null,
      shareVisibility: normalizeShareVisibility(input.shareVisibility),
    },
  });

  if (input.prayer?.trim()) {
    await db.prayerTopic.create({
      data: {
        userId,
        sourceEntryId: entry.id,
        title: input.prayer.trim().slice(0, 80),
        body: input.prayer.trim(),
        status: "continuing",
      },
    });
  }

  if (input.actionStep?.trim()) {
    await db.actionStep.create({
      data: {
        userId,
        sourceEntryId: entry.id,
        body: input.actionStep.trim(),
        status: "pending",
      },
    });
  }

  await syncEntryShare(userId, entry.id);
  return serializeEntry(entry);
}

export async function updateEntry(userId: string, id: string, input: EntryInput) {
  const existing = await db.reflectionEntry.findFirst({
    where: { id, userId, deletedAt: null },
  });
  if (!existing) throw new Error("기록을 찾을 수 없습니다.");
  const error = validateEntryInput(input);
  if (error) throw new Error(error);
  const scripture = scriptureFields(input);

  const entry = await db.reflectionEntry.update({
    where: { id },
    data: {
      entryDate: input.entryDate ? new Date(input.entryDate) : existing.entryDate,
      title: input.title?.trim() || null,
      ...scripture,
      reflectionBody: input.reflectionBody.trim(),
      gratitude: input.gratitude?.trim() || null,
      question: input.question?.trim() || null,
      prayer: input.prayer?.trim() || null,
      actionStep: input.actionStep?.trim() || null,
      emotions: toJsonArray(input.emotions),
      tags: toJsonArray(input.tags),
      templateType: input.templateType || existing.templateType,
      privateNote: input.privateNote?.trim() || null,
      cellShareSummary: input.cellShareSummary?.trim() || null,
      shareVisibility: normalizeShareVisibility(
        input.shareVisibility ?? existing.shareVisibility,
      ),
    },
  });

  await syncActionStepForEntry(userId, entry.id, input.actionStep);
  await syncEntryShare(userId, entry.id);

  return serializeEntry(entry);
}

async function syncActionStepForEntry(
  userId: string,
  entryId: string,
  actionStep?: string | null,
) {
  const body = actionStep?.trim() || "";
  const existing = await db.actionStep.findFirst({
    where: { userId, sourceEntryId: entryId },
    orderBy: { createdAt: "desc" },
  });

  if (!body) {
    // Keep historical steps; do not delete when user clears the field.
    return;
  }

  if (existing && (existing.status === "pending" || existing.status === "walking")) {
    await db.actionStep.update({
      where: { id: existing.id },
      data: { body },
    });
    return;
  }

  if (!existing) {
    await db.actionStep.create({
      data: {
        userId,
        sourceEntryId: entryId,
        body,
        status: "pending",
      },
    });
  }
}

export async function listEntries(
  userId: string,
  opts: { q?: string; limit?: number; cursor?: string; filter?: "actions" } = {},
) {
  const limit = opts.limit ?? 50;
  const entries = await db.reflectionEntry.findMany({
    where: {
      userId,
      ...(opts.filter === "actions" ? { actionStep: { not: null } } : {}),
      deletedAt: null,
      ...(opts.q
        ? {
            OR: [
              { title: { contains: opts.q } },
              { reflectionBody: { contains: opts.q } },
              { prayer: { contains: opts.q } },
              { actionStep: { contains: opts.q } },
              { scriptureRefs: { contains: opts.q } },
              { scriptureBindings: { contains: opts.q } },
              { tags: { contains: opts.q } },
            ],
          }
        : {}),
    },
    orderBy: [{ entryDate: "desc" }, { id: "desc" }],
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    take: limit,
  });
  return entries.map(serializeEntry);
}

export async function getEntry(userId: string, id: string) {
  const entry = await db.reflectionEntry.findFirst({
    where: { id, userId, deletedAt: null },
  });
  return entry ? serializeEntry(entry) : null;
}

export async function softDeleteEntry(userId: string, id: string) {
  const existing = await db.reflectionEntry.findFirst({
    where: { id, userId, deletedAt: null },
  });
  if (!existing) throw new Error("기록을 찾을 수 없습니다.");
  await db.reflectionEntry.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await withdrawSharesForDeletedEntry(userId, id);
}

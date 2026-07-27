import { db } from "@/lib/db";
import type { ScriptureBinding } from "@/lib/bible";
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
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  const scriptureBindings = parseBindings(entry.scriptureBindings);
  const scriptureRefs = parseJsonArray(entry.scriptureRefs);
  return {
    ...entry,
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
    },
  });
  return serializeEntry(entry);
}

export async function listEntries(
  userId: string,
  opts: { q?: string; limit?: number } = {},
) {
  const limit = opts.limit ?? 50;
  const entries = await db.reflectionEntry.findMany({
    where: {
      userId,
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
    orderBy: { entryDate: "desc" },
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
}

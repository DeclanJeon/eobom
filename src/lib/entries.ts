import { db } from "@/lib/db";
import { parseJsonArray, toJsonArray } from "@/lib/utils";

export type EntryInput = {
  entryDate?: string;
  title?: string | null;
  scriptureRefs?: string[];
  scriptureExcerpt?: string | null;
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

export function validateEntryInput(input: EntryInput): string | null {
  const body = input.reflectionBody?.trim();
  if (!body) return "묵상 본문을 입력해 주세요.";
  const hasTitle = Boolean(input.title?.trim());
  const hasScripture = (input.scriptureRefs?.length ?? 0) > 0;
  if (!hasTitle && !hasScripture) {
    return "성구 또는 제목 중 하나는 필요합니다.";
  }
  return null;
}

export function serializeEntry(entry: {
  id: string;
  userId: string;
  entryDate: Date;
  title: string | null;
  scriptureRefs: string;
  scriptureExcerpt: string | null;
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
  return {
    ...entry,
    scriptureRefs: parseJsonArray(entry.scriptureRefs),
    emotions: parseJsonArray(entry.emotions),
    tags: parseJsonArray(entry.tags),
  };
}

export async function createEntry(userId: string, input: EntryInput) {
  const error = validateEntryInput(input);
  if (error) throw new Error(error);

  const entry = await db.reflectionEntry.create({
    data: {
      userId,
      entryDate: input.entryDate ? new Date(input.entryDate) : new Date(),
      title: input.title?.trim() || null,
      scriptureRefs: toJsonArray(input.scriptureRefs),
      scriptureExcerpt: input.scriptureExcerpt?.trim() || null,
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

  const entry = await db.reflectionEntry.update({
    where: { id },
    data: {
      entryDate: input.entryDate ? new Date(input.entryDate) : existing.entryDate,
      title: input.title?.trim() || null,
      scriptureRefs: toJsonArray(input.scriptureRefs),
      scriptureExcerpt: input.scriptureExcerpt?.trim() || null,
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

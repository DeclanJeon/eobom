import { db } from "@/lib/db";
import { logEvent } from "@/lib/events";
import type { ScriptureBinding } from "@/lib/bible";
import {
  normalizeShareVisibility,
  syncEntryShare,
  withdrawSharesForDeletedEntry,
  type ShareVisibility,
} from "@/lib/entry-share";
import { parseJsonArray, toJsonArray } from "@/lib/utils";

// ReflectionEntry FTS5 — ensure + search
let entryFtsEnsured = false;

function normalizeFtsQuery(query: string): string {
  return query.replace(/[^0-9a-zA-Z가-힣\s]/g, " ").replace(/\s+/g, " ").trim();
}

function buildEntryMatchExpr(normalized: string): string {
  const terms = normalized.split(" ").filter((t) => t.length > 0);
  if (terms.length === 0) return "";
  return terms.map((t) => `"${t.replace(/"/g, "")}"`).join(" OR ");
}

export async function ensureEntryFts5(targetDb: typeof db = db): Promise<void> {
  if (targetDb === db && entryFtsEnsured) return;
  try {
    const existing = await targetDb.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master WHERE type='table' AND name='ReflectionEntryFts'
    `;
    if (existing.length > 0) {
      if (targetDb === db) entryFtsEnsured = true;
      return;
    }
  } catch {
    // ignore and try to create
  }
  // Keep the tokenizer portable across SQLite builds used by local and CI tests.
  const createSql = `
    CREATE VIRTUAL TABLE IF NOT EXISTS ReflectionEntryFts USING fts5(
      entryId UNINDEXED,
      title,
      reflectionBody,
      gratitude,
      prayer,
      tokenize = 'unicode61'
    );
  `;
  const triggers = [
    `CREATE TRIGGER IF NOT EXISTS reflection_entry_ai AFTER INSERT ON ReflectionEntry BEGIN
      INSERT INTO ReflectionEntryFts (entryId, title, reflectionBody, gratitude, prayer)
      VALUES (new.id, new.title, new.reflectionBody, new.gratitude, new.prayer);
    END;`,
    `CREATE TRIGGER IF NOT EXISTS reflection_entry_ad AFTER DELETE ON ReflectionEntry BEGIN
      DELETE FROM ReflectionEntryFts WHERE entryId = old.id;
    END;`,
    `CREATE TRIGGER IF NOT EXISTS reflection_entry_au AFTER UPDATE ON ReflectionEntry BEGIN
      DELETE FROM ReflectionEntryFts WHERE entryId = old.id;
      INSERT INTO ReflectionEntryFts (entryId, title, reflectionBody, gratitude, prayer)
      VALUES (new.id, new.title, new.reflectionBody, new.gratitude, new.prayer);
    END;`,
  ];
  const backfill = `
    INSERT INTO ReflectionEntryFts (entryId, title, reflectionBody, gratitude, prayer)
    SELECT id, title, reflectionBody, gratitude, prayer FROM ReflectionEntry WHERE deletedAt IS NULL
    AND id NOT IN (SELECT entryId FROM ReflectionEntryFts);
  `;
  const tryExec = async (sql: string) => {
    await (targetDb as unknown as { $executeRawUnsafe: (s: string) => Promise<unknown> }).$executeRawUnsafe(sql);
  };
  try {
    await tryExec(createSql);
  } catch {
    // FTS is optional; LIKE search remains the functional fallback.
  }
  for (const t of triggers) {
    try { await tryExec(t); } catch {}
  }
  try { await tryExec(backfill); } catch {}
  if (targetDb === db) entryFtsEnsured = true;
}

export async function searchEntriesFts(
  userId: string,
  query: string,
  opts: { limit?: number } = {},
): Promise<ReturnType<typeof serializeEntry>[]> {
  const normalized = normalizeFtsQuery(query);
  const matchExpr = buildEntryMatchExpr(normalized);
  if (!matchExpr) return [];
  await ensureEntryFts5();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  // Escape single quotes in matchExpr for raw SQL
  const safeMatch = matchExpr.replace(/'/g, "''");
  const safeUserId = userId.replace(/'/g, "''");
  const sql = `
    SELECT e.id, e.userId, e.entryDate, e.title, e.scriptureRefs, e.scriptureExcerpt, e.scriptureBindings,
           e.reflectionBody, e.gratitude, e.question, e.prayer, e.actionStep, e.emotions, e.tags,
           e.templateType, e.privateNote, e.cellShareSummary, e.shareVisibility,
           e.createdAt, e.updatedAt, e.deletedAt,
           bm25(ReflectionEntryFts) as rank
    FROM ReflectionEntryFts
    JOIN ReflectionEntry e ON e.id = ReflectionEntryFts.entryId
    WHERE ReflectionEntryFts MATCH '${safeMatch}'
      AND e.userId = '${safeUserId}'
      AND e.deletedAt IS NULL
    ORDER BY rank
    LIMIT ${limit}
  `;
  try {
    const rows = await (db as unknown as { $queryRawUnsafe: (s: string) => Promise<Record<string, unknown>[]> }).$queryRawUnsafe(sql);
    // Map to Prisma shape
    return rows.map((r) =>
      serializeEntry({
        id: String(r.id),
        userId: String(r.userId),
        entryDate: r.entryDate instanceof Date ? r.entryDate : new Date(String(r.entryDate)),
        title: r.title ? String(r.title) : null,
        scriptureRefs: String(r.scriptureRefs ?? "[]"),
        scriptureExcerpt: r.scriptureExcerpt ? String(r.scriptureExcerpt) : null,
        scriptureBindings: r.scriptureBindings ? String(r.scriptureBindings) : null,
        reflectionBody: String(r.reflectionBody),
        gratitude: r.gratitude ? String(r.gratitude) : null,
        question: r.question ? String(r.question) : null,
        prayer: r.prayer ? String(r.prayer) : null,
        actionStep: r.actionStep ? String(r.actionStep) : null,
        emotions: String(r.emotions ?? "[]"),
        tags: String(r.tags ?? "[]"),
        templateType: String(r.templateType ?? "free"),
        privateNote: r.privateNote ? String(r.privateNote) : null,
        cellShareSummary: r.cellShareSummary ? String(r.cellShareSummary) : null,
        shareVisibility: r.shareVisibility ? String(r.shareVisibility) : null,
        createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(String(r.createdAt)),
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt : new Date(String(r.updatedAt)),
        deletedAt: r.deletedAt ? (r.deletedAt instanceof Date ? r.deletedAt : new Date(String(r.deletedAt))) : null,
      }),
    );
  } catch {
    return [];
  }
}
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

  // 마지막 기록 시간 업데이트 (이메일 리마인더용)
  await db.user.update({
    where: { id: userId },
    data: { lastRecordedAt: new Date() },
  });

  // 계측 — 기록 생성 확정 후 await 로깅 (B4: 사용자 액션 이벤트는 확정)
  // 계측 실패가 이미 저장된 기록의 API 응답/재시도를 깨지 않게 흡수한다.
  await logEvent({
    userId,
    eventType: "entry_created",
    meta: {
      entryId: entry.id,
      quick: input.templateType === "quick" ? 1 : 0,
    },
    fireAndForget: true,
  });

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

export type QuickEntryInput = {
  body: string;
  scriptureRefs?: string[];
  scriptureBindings?: ScriptureBinding[];
  scriptureExcerpt?: string | null;
};

/** 본문 앞 40자에서 제목 생성 (markdown 제거). quick 저장 자동 제목용. */
export function titleFromBody(body: string): string {
  const plain = body
    .replace(/[#>*_`~\-\[\]()!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "오늘의 묵상";
  return plain.slice(0, 40) + (plain.length > 40 ? "…" : "");
}

/**
 * quick 기록 행 생성 (트랜잭션 클라이언트 호환) — 이벤트 로깅 없음.
 * GATE-1: shareVisibility="private" 서버 강제, syncEntryShare 미호출.
 */
export async function createQuickEntryRecord(
  client: Pick<typeof db, "reflectionEntry" | "user">,
  userId: string,
  input: QuickEntryInput,
) {
  const body = input.body?.trim();
  if (!body) throw new Error("한 줄 본문을 입력해 주세요.");
  if (body.length > 500) throw new Error("한 줄 본문은 500자 이내로 입력해 주세요.");
  const scripture = scriptureFields({
    reflectionBody: body,
    scriptureRefs: input.scriptureRefs,
    scriptureBindings: input.scriptureBindings,
    scriptureExcerpt: input.scriptureExcerpt,
  } as EntryInput);

  const entry = await client.reflectionEntry.create({
    data: {
      userId,
      entryDate: new Date(),
      title: titleFromBody(body),
      ...scripture,
      reflectionBody: body,
      templateType: "quick",
      shareVisibility: "private", // GATE-1: 서버 강제
    },
  });

  await client.user.update({
    where: { id: userId },
    data: { lastRecordedAt: new Date() },
  });

  return entry;
}

/**
 * 카드 한 줄 → quick 기록 승격 (GATE-1).
 * - shareVisibility="private" 서버 강제 (클라이언트 값 무시) — 명시적 공개 전 비공개.
 * - syncEntryShare 미호출 — quick 저장만으로는 Together에 절대 게시되지 않는다.
 * - 성구 선택적 (Memory 카드에 성구가 없을 수 있음), 제목은 본문에서 자동 생성.
 * - one_line_saved + entry_created 이벤트 기록 (await 확정).
 */
export async function createQuickEntry(userId: string, input: QuickEntryInput) {
  const entry = await createQuickEntryRecord(db, userId, input);

  // 분석 로그 실패가 이미 저장된 quick 기록을 4xx로 바꾸지 않게 흡수한다.
  await logEvent({
    userId,
    eventType: "one_line_saved",
    meta: { entryId: entry.id, quick: 1 },
    fireAndForget: true,
  });
  await logEvent({
    userId,
    eventType: "entry_created",
    meta: { entryId: entry.id, quick: 1 },
    fireAndForget: true,
  });

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
  // q 검색: FTS5 우선, 실패 시 LIKE fallback (cursor 없는 경우만 FTS로 정렬, cursor 있으면 LIKE로 페이지네이션 유지)
  if (opts.q && opts.q.trim().length > 0 && !opts.cursor) {
    try {
      const fts = await searchEntriesFts(userId, opts.q, { limit });
      if (fts.length > 0) {
        if (opts.filter === "actions") {
          const filtered = fts.filter((e) => Boolean(e.actionStep));
          if (filtered.length > 0) return filtered;
        } else {
          return fts;
        }
      }
      // 빈 결과이면 LIKE로 재시도 (FTS tokenizer 차이 대비)
    } catch {
      // fallthrough to LIKE
    }
  }
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

import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { db } from "@/lib/db";
import { toJsonArray } from "@/lib/utils";
import { checkRateLimit, RATE_LIMITS, rateLimitedBody } from "@/lib/rate-limit";
/** 배열이면 직렬화, 문자열이면 그대로, 그 외엔 fallback. */
function jsonArrayOr(raw: unknown, fallback: string): string {
  if (Array.isArray(raw)) return toJsonArray(raw as string[]);
  if (typeof raw === "string") return raw;
  return fallback;
}

function strOrNull(raw: unknown): string | null {
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

/**
 * POST /api/import — 내보낸 JSON(entries)을 현재 identity로 재귀속하여 가져온다.
 * 묵상 기록(entries)만 이동한다. AI 회고·공유는 참조 id가 달라 재생성 대상이므로 제외.
 */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const limited = await checkRateLimit(`import:${auth.user.id}`, { limit: 5, windowMs: 60 * 1000 });
  if (!limited.ok) return NextResponse.json(rateLimitedBody(limited.retryAfterSec), { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } });
  const user = auth.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const entries = Array.isArray(
    (body as { entries?: unknown })?.entries,
  )
    ? ((body as { entries: unknown[] }).entries)
    : [];
  if (entries.length > 100) {
    return NextResponse.json({ error: "too many entries (max 100)" }, { status: 400 });
  }

  let imported = 0;
  let skipped = 0;
  for (const raw of entries) {
    if (!raw || typeof raw !== "object") {
      skipped++;
      continue;
    }
    const r = raw as Record<string, unknown>;
    if (typeof r.reflectionBody !== "string" || !r.reflectionBody.trim()) {
      skipped++;
      continue;
    }
    const entryDate = new Date(String(r.entryDate ?? ""));
    if (Number.isNaN(entryDate.getTime())) {
      skipped++;
      continue;
    }

    await db.reflectionEntry.create({
      data: {
        userId: user.id,
        entryDate,
        title: strOrNull(r.title),
        scriptureRefs: jsonArrayOr(r.scriptureRefs, "[]"),
        scriptureExcerpt: strOrNull(r.scriptureExcerpt),
        scriptureBindings: jsonArrayOr(r.scriptureBindings, "[]"),
        reflectionBody: r.reflectionBody,
        gratitude: strOrNull(r.gratitude),
        question: strOrNull(r.question),
        prayer: strOrNull(r.prayer),
        actionStep: strOrNull(r.actionStep),
        emotions: jsonArrayOr(r.emotions, "[]"),
        tags: jsonArrayOr(r.tags, "[]"),
        templateType: typeof r.templateType === "string" ? r.templateType : "free",
        privateNote: strOrNull(r.privateNote),
        cellShareSummary: strOrNull(r.cellShareSummary),
        shareVisibility:
          r.shareVisibility === "public" ? "public" : "private",
      },
    });
    imported++;
  }

  return NextResponse.json({ ok: true, imported, skipped });
}

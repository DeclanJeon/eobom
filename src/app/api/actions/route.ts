import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { parseJsonBody, tinyActionSchema } from "@/lib/api-schemas";
import { db } from "@/lib/db";
import { TINY_ACTION_FOLLOWUP_DAYS, findTinyAction } from "@/lib/tiny-action";
import { checkRateLimit, RATE_LIMITS, rateLimitedBody } from "@/lib/rate-limit";
/**
 * Tiny Action 생성 (설계 05§11) — opt-in only.
 * 카탈로그 id만 받아 서버에서 문구를 결정한다(클라이언트 주입 차단).
 */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;
  const limited = await checkRateLimit(`actions:create:${user.id}`, RATE_LIMITS.actionsCreate);

  const parsed = await parseJsonBody(request, tinyActionSchema);
  if (!parsed.ok) return parsed.response;

  const item = findTinyAction(parsed.data.catalogId);
  if (!item) {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  if (parsed.data.sourceEntryId) {
    const entry = await db.reflectionEntry.findFirst({
      where: { id: parsed.data.sourceEntryId, userId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 동일 기록에 같은 카탈로그 행동이 이미 열려 있으면 중복 생성하지 않는다.
  if (parsed.data.sourceEntryId) {
    const existing = await db.actionStep.findFirst({
      where: {
        userId: user.id,
        sourceEntryId: parsed.data.sourceEntryId,
        body: item.body,
        status: { in: ["pending", "walking"] },
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ actionStepId: existing.id, created: false });
    }
  }

  const created = await db.actionStep.create({
    data: {
      userId: user.id,
      sourceEntryId: parsed.data.sourceEntryId ?? null,
      body: item.body,
      targetDate: new Date(Date.now() + TINY_ACTION_FOLLOWUP_DAYS * 24 * 60 * 60 * 1000),
    },
    select: { id: true },
  });
  return NextResponse.json({ actionStepId: created.id, created: true }, { status: 201 });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseJsonArray, toJsonArray } from "@/lib/utils";

export async function GET() {
  const items = await db.sharedReflection.findMany({
    where: {
      visibility: "public",
      withdrawnAt: null,
      deletedAt: null,
    },
    orderBy: { publishedAt: "desc" },
    take: 50,
    include: {
      reactions: true,
    },
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      publicBody: item.publicBody,
      scriptureRefs: parseJsonArray(item.scriptureRefs),
      topicTags: parseJsonArray(item.topicTags),
      pseudonym: item.pseudonym || "익명의 순례자",
      publishedAt: item.publishedAt,
      reactions: summarizeReactions(item.reactions),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    sourceEntryId?: string;
    publicBody?: string;
    scriptureRefs?: string[];
    topicTags?: string[];
    pseudonym?: string;
  };

  const publicBody = body.publicBody?.trim() || "";
  if (publicBody.length < 20) {
    return NextResponse.json(
      { error: "공유 본문은 20자 이상 작성해 주세요." },
      { status: 400 },
    );
  }

  if (body.sourceEntryId) {
    const entry = await db.reflectionEntry.findFirst({
      where: {
        id: body.sourceEntryId,
        userId: session.user.id,
        deletedAt: null,
      },
    });
    if (!entry) {
      return NextResponse.json({ error: "원문 기록을 찾을 수 없습니다." }, { status: 404 });
    }
  }

  const safety = scanSafety(publicBody);
  const created = await db.sharedReflection.create({
    data: {
      ownerUserId: session.user.id,
      sourceEntryId: body.sourceEntryId || null,
      publicBody,
      scriptureRefs: toJsonArray(body.scriptureRefs),
      topicTags: toJsonArray(body.topicTags),
      pseudonym: body.pseudonym?.trim() || "익명의 순례자",
      safetyScanResult: JSON.stringify(safety),
      visibility: safety.blocked ? "private" : "public",
    },
  });

  if (safety.blocked) {
    return NextResponse.json(
      {
        error: "개인정보 또는 위험 표현이 감지되어 공개되지 않았습니다. 내용을 수정해 주세요.",
        safety,
        id: created.id,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ item: created }, { status: 201 });
}

function summarizeReactions(
  reactions: Array<{ reactionType: string }>,
) {
  const counts: Record<string, number> = {};
  for (const r of reactions) {
    counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
  }
  return counts;
}

function scanSafety(text: string) {
  const findings: string[] = [];
  if (/(010|011|016|017|018|019)[-.\s]?\d{3,4}[-.\s]?\d{4}/.test(text)) {
    findings.push("phone");
  }
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) {
    findings.push("email");
  }
  if (/(자살|죽고\s*싶|자해|타해)/.test(text)) {
    findings.push("crisis");
  }
  return {
    findings,
    blocked: findings.includes("phone") || findings.includes("email") || findings.includes("crisis"),
  };
}

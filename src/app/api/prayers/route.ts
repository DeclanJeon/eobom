import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/session";
import { db } from "@/lib/db";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional(),
  sourceEntryId: z.string().min(1).optional(),
});

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  // 기존 /me/prayers 페이지와 동일한 쿼리 공유
  const topics = await db.prayerTopic.findMany({
    where: { userId: user.id },
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ prayerTopics: topics });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  const { title, body, sourceEntryId } = parsed.data;

  // sourceEntryId가 있으면 해당 entry가 본인 소유인지 확인
  let validSourceEntryId: string | null = null;
  if (sourceEntryId) {
    const entry = await db.reflectionEntry.findFirst({
      where: { id: sourceEntryId, userId: user.id },
      select: { id: true },
    });
    if (entry) validSourceEntryId = entry.id;
  }

  const created = await db.prayerTopic.create({
    data: {
      userId: user.id,
      title,
      body: body ?? null,
      sourceEntryId: validSourceEntryId,
      status: "continuing",
    },
  });

  return NextResponse.json({ prayerTopic: created }, { status: 200 });
}

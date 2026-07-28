import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { parseJsonBody, reactionSchema } from "@/lib/api-schemas";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;
  const { id } = await ctx.params;
  const parsed = await parseJsonBody(request, reactionSchema);
  if (!parsed.ok) return parsed.response;
  const reactionType = parsed.data.reactionType;

  const shared = await db.sharedReflection.findFirst({
    where: { id, visibility: "public", withdrawnAt: null, deletedAt: null },
  });
  if (!shared) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await db.communityReaction.findUnique({
    where: {
      sharedReflectionId_userId_reactionType: {
        sharedReflectionId: id,
        userId: user.id,
        reactionType,
      },
    },
  });

  if (existing) {
    await db.communityReaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ toggled: false });
  }

  await db.communityReaction.create({
    data: {
      sharedReflectionId: id,
      userId: user.id,
      reactionType,
    },
  });
  return NextResponse.json({ toggled: true });
}

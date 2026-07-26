import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED = new Set(["empathize", "pray", "same_scripture", "bookmark"]);

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = (await request.json()) as { reactionType?: string };
  const reactionType = body.reactionType || "";
  if (!ALLOWED.has(reactionType)) {
    return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
  }

  const shared = await db.sharedReflection.findFirst({
    where: { id, visibility: "public", withdrawnAt: null, deletedAt: null },
  });
  if (!shared) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await db.communityReaction.findUnique({
    where: {
      sharedReflectionId_userId_reactionType: {
        sharedReflectionId: id,
        userId: session.user.id,
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
      userId: session.user.id,
      reactionType,
    },
  });
  return NextResponse.json({ toggled: true });
}

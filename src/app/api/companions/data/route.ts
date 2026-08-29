import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { db } from "@/lib/db";

export async function DELETE() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;
  await db.$transaction(async (tx) => {
    const connections = await tx.companionConnection.findMany({
      where: { OR: [{ requesterId: userId }, { counterpartyId: userId }] },
      select: { id: true },
    });
    const connectionIds = connections.map((connection) => connection.id);
    if (connectionIds.length) await tx.companionMessage.deleteMany({ where: { connectionId: { in: connectionIds } } });
    await tx.companionCandidate.deleteMany({ where: { OR: [{ requesterId: userId }, { matchedUserId: userId }] } });
    await tx.companionSafetyEvent.deleteMany({ where: { OR: [{ actorUserId: userId }, { targetUserId: userId }] } });
    await tx.companionBlock.deleteMany({ where: { OR: [{ blockerUserId: userId }, { blockedUserId: userId }] } });
    await tx.companionConnection.deleteMany({ where: { id: { in: connectionIds } } });
    await tx.companionProfile.deleteMany({ where: { userId } });
    await tx.user.update({ where: { id: userId }, data: { companionConsent: false } });
  });
  return NextResponse.json({ ok: true });
}

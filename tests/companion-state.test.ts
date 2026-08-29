import { describe, expect, test } from "bun:test";
import { db } from "@/lib/db";
import {
  decideCompanionCandidate,
  listCompanionCandidates,
  recordCompanionSafetyEvent,
  upsertCompanionProfile,
} from "@/lib/companions";

async function user(email: string) {
  return db.user.create({ data: { email } });
}

describe("companion state and safety", () => {
  test("requires both decisions and keeps repeated acceptance idempotent", async () => {
    const requester = await user(`state-${crypto.randomUUID()}@test.local`);
    const counterparty = await user(`state-${crypto.randomUUID()}@test.local`);
    const candidate = await db.companionCandidate.create({
      data: { requesterId: requester.id, matchedUserId: counterparty.id, supportingEntryIds: "[\"private-entry\"]" },
    });

    expect((await decideCompanionCandidate(requester.id, candidate.id, { decision: "accepted" })).status).toBe("pending_counterparty");
    expect((await decideCompanionCandidate(counterparty.id, candidate.id, { decision: "accepted" })).status).toBe("connected");
    expect((await decideCompanionCandidate(counterparty.id, candidate.id, { decision: "accepted" })).status).toBe("connected");
    expect(await db.companionConnection.count({ where: { candidateId: candidate.id } })).toBe(1);
  });

  test("does not re-expose rejected candidates and clears private IDs on disable", async () => {
    const requester = await user(`state-${crypto.randomUUID()}@test.local`);
    const counterparty = await user(`state-${crypto.randomUUID()}@test.local`);
    await db.user.update({ where: { id: requester.id }, data: { companionConsent: true } });
    await db.companionProfile.create({ data: { userId: requester.id, scopeKey: "private" } });
    await db.companionProfile.create({ data: { userId: counterparty.id, enabled: true, acceptsRequests: true, scopeKey: "private" } });
    const candidate = await db.companionCandidate.create({
      data: { requesterId: requester.id, matchedUserId: counterparty.id, supportingEntryIds: "[\"private-entry\"]", status: "candidate" },
    });
    await decideCompanionCandidate(requester.id, candidate.id, { decision: "rejected" });
    expect(await listCompanionCandidates(requester.id)).toEqual([]);

    const other = await user(`state-${crypto.randomUUID()}@test.local`);
    const stillPrivate = await db.companionCandidate.create({
      data: { requesterId: requester.id, matchedUserId: other.id, supportingEntryIds: "[\"private-entry-2\"]" },
    });
    await upsertCompanionProfile(requester.id, { enabled: false });
    expect((await db.companionCandidate.findUnique({ where: { id: stillPrivate.id } }))?.supportingEntryIds).toBe("[]");
  });

  test("rejects unauthorized connection actions and makes repeated blocks safe", async () => {
    const requester = await user(`state-${crypto.randomUUID()}@test.local`);
    const counterparty = await user(`state-${crypto.randomUUID()}@test.local`);
    const stranger = await user(`state-${crypto.randomUUID()}@test.local`);
    const connection = await db.companionConnection.create({
      data: {
        candidateId: `connection-${crypto.randomUUID()}`,
        pairKey: `${requester.id}:${counterparty.id}`,
        requesterId: requester.id,
        counterpartyId: counterparty.id,
        requesterAcceptedAt: new Date(),
        counterpartyAcceptedAt: new Date(),
      },
    });

    await expect(recordCompanionSafetyEvent(stranger.id, { targetUserId: counterparty.id, connectionId: connection.id, type: "end" })).rejects.toThrow();
    await recordCompanionSafetyEvent(requester.id, { targetUserId: counterparty.id, connectionId: connection.id, type: "block" });
    await expect(recordCompanionSafetyEvent(requester.id, { targetUserId: counterparty.id, connectionId: connection.id, type: "block" })).resolves.toMatchObject({ type: "block" });
  });

  test("reports do not end an active connection", async () => {
    const requester = await user(`state-${crypto.randomUUID()}@test.local`);
    const counterparty = await user(`state-${crypto.randomUUID()}@test.local`);
    const connection = await db.companionConnection.create({
      data: {
        candidateId: `connection-${crypto.randomUUID()}`,
        pairKey: `${requester.id}:${counterparty.id}`,
        requesterId: requester.id,
        counterpartyId: counterparty.id,
        requesterAcceptedAt: new Date(),
        counterpartyAcceptedAt: new Date(),
      },
    });
    await recordCompanionSafetyEvent(requester.id, {
      targetUserId: counterparty.id,
      connectionId: connection.id,
      type: "report",
      reason: "확인 필요",
    });
    expect((await db.companionConnection.findUnique({ where: { id: connection.id } }))?.status).toBe("connected");
  });
});

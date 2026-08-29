import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/utils";
import { validateProviderResult } from "@/lib/companion-match-provider";
import type {
  CompanionProfile,
  CompanionCandidate,
} from "@prisma/client";

// ─── Constants ─────────────────────────────────────────────────────────────────

const MAX_CANDIDATES = 3;
const COMPANIONS_ENABLED = process.env.COMPANIONS_ENABLED === "true";
const GENERATOR_MODEL_VERSION = "v1-deterministic-tag-overlap";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CompanionProfileData {
  enabled: boolean;
  acceptsRequests: boolean;
  scopeKey: string;
  role: string | null;
  topicTags: string[];
  helpModes: string[];
  intro: string | null;
  availability: string | null;
  consentVersion: string | null;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateProjection {
  id: string;
  profile: {
    displayName: string;
    role: string | null;
    topicTags: string[];
    helpModes: string[];
    intro: string | null;
    availability: string | null;
  };
  reasonSummary: string | null;
  signalLabels: string[];
  expiresAt: string | null;
  createdAt: string;
}

interface ProfileUpdateInput {
  enabled?: boolean;
  acceptsRequests?: boolean;
  scopeKey?: "private" | "same_group" | "curated";
  role?: string;
  topicTags?: string[];
  helpModes?: string[];
  intro?: string | null;
  availability?: string | null;
}

const CONTACT_PATTERN = /(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\b01[016789]-?\d{3,4}-?\d{4}\b)/i;
const CRISIS_PATTERN = /(죽고 싶|자해|극단적 선택|살고 싶지 않)/i;
const MODERATION_PATTERN = /(카톡|텔레그램|인스타|DM|직접 만나|전화번호)/i;
const SENSITIVE_PATTERN = /(학대|폭력|응급|진단|처방|약물|소송|법률|성폭력|위기)/i;

function safePublicText(value: string | null | undefined): string | null {
  if (!value || CONTACT_PATTERN.test(value) || CRISIS_PATTERN.test(value) || SENSITIVE_PATTERN.test(value)) return null;
  return value;
}

function safePublicArray(value: string): string[] {
  return parseJsonArray(value).filter(
    (item) =>
      !CONTACT_PATTERN.test(item) &&
      !CRISIS_PATTERN.test(item) &&
      !SENSITIVE_PATTERN.test(item),
  );
}

function safeSignalSet(value: string): Set<string> {
  return new Set(
    parseJsonArray(value).filter(
      (item) =>
        !CONTACT_PATTERN.test(item) &&
        !CRISIS_PATTERN.test(item) &&
        !SENSITIVE_PATTERN.test(item),
    ),
  );
}

// ─── Serialization ─────────────────────────────────────────────────────────────

export function serializeCompanionProfile(
  profile: CompanionProfile,
): CompanionProfileData {
  const safeRole = ["peer", "mentor", "prayer_partner"].includes(profile.role ?? "")
    ? profile.role
    : null;
  return {
    enabled: profile.enabled,
    acceptsRequests: profile.acceptsRequests,
    scopeKey: profile.scopeKey,
    role: safeRole,
    topicTags: safePublicArray(profile.topicTags),
    helpModes: safePublicArray(profile.helpModes),
    intro: safePublicText(profile.intro),
    availability: safePublicText(profile.availability),
    consentVersion: profile.consentVersion ?? null,
    disabledAt: profile.disabledAt?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

/**
 * Public candidate projection — never exposes userId, matchedUserId,
 * supportingEntryIds, or any private/contact data.
 */
export function serializeCandidate(
  candidate: CompanionCandidate,
  profile?: CompanionProfile & {
    user?: {
      displayName?: string | null;
      name?: string | null;
      companionConsent?: boolean;
    };
  },
): CandidateProjection {
  return {
    id: candidate.id,
    profile: {
      displayName: profile?.user?.displayName || profile?.user?.name || "이어봄 동행자",
      role: ["peer", "mentor", "prayer_partner"].includes(profile?.role ?? "") ? profile?.role ?? null : null,
      topicTags: profile ? safePublicArray(profile.topicTags) : [],
      helpModes: profile ? safePublicArray(profile.helpModes) : [],
      intro: safePublicText(profile?.intro),
      availability: safePublicText(profile?.availability),
    },
    reasonSummary: candidate.reasonSummary ?? null,
    signalLabels: parseJsonArray(candidate.signalLabels),
    expiresAt: candidate.expiresAt?.toISOString() ?? null,
    createdAt: candidate.createdAt.toISOString(),
  };
}

// ─── Profile CRUD ──────────────────────────────────────────────────────────────

export async function getCompanionProfile(
  userId: string,
): Promise<CompanionProfile | null> {
  return db.companionProfile.findUnique({ where: { userId } });
}

export async function getCompanionProfileOrCreate(
  userId: string,
): Promise<CompanionProfile> {
  const existing = await db.companionProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.companionProfile.create({
    data: { userId },
  });
}

export async function upsertCompanionProfile(
  userId: string,
  input: ProfileUpdateInput,
): Promise<CompanionProfile> {
  return db.$transaction(async (tx) => {
  const updateData: Record<string, unknown> = {};

  if (typeof input.enabled === "boolean") {
    updateData.enabled = input.enabled;
    updateData.disabledAt = input.enabled ? null : new Date();
  }

  if (typeof input.acceptsRequests === "boolean") {
    updateData.acceptsRequests = input.acceptsRequests;
  }
  if (input.scopeKey !== undefined) updateData.scopeKey = input.scopeKey;

  if (input.role !== undefined) {
    updateData.role = input.role;
  }

  if (input.topicTags !== undefined) {
    if (input.topicTags.some((tag) => CONTACT_PATTERN.test(tag))) {
      throw new Error("연락처나 외부 링크는 주제에 적을 수 없습니다.");
    }
    updateData.topicTags = JSON.stringify(input.topicTags);
  }

  if (input.helpModes !== undefined) {
    updateData.helpModes = JSON.stringify(input.helpModes);
  }

  if (input.intro !== undefined) {
    if (input.intro && CONTACT_PATTERN.test(input.intro)) {
      throw new Error("연락처나 외부 링크는 동행 소개에 적을 수 없습니다.");
    }
    updateData.intro = input.intro;
  }

  if (input.availability !== undefined) {
    if (input.availability && CONTACT_PATTERN.test(input.availability)) {
      throw new Error("연락처나 외부 링크는 가능 시간에 적을 수 없습니다.");
    }
    updateData.availability = input.availability;
  }

  const profile = await tx.companionProfile.upsert({
    where: { userId },
    create: {
      userId,
      consentVersion: "v1",
      enabled: (updateData.enabled as boolean) ?? false,
      acceptsRequests: (updateData.acceptsRequests as boolean) ?? false,
      scopeKey: (updateData.scopeKey as string) ?? "private",
      role: (updateData.role as string) ?? null,
      topicTags: (updateData.topicTags as string) ?? "[]",
      helpModes: (updateData.helpModes as string) ?? "[]",
      intro: (updateData.intro as string | null) ?? null,
      availability: (updateData.availability as string | null) ?? null,
      disabledAt: (updateData.disabledAt as Date | null) ?? null,
    },
    update: updateData,
  });
  if (input.enabled === false) {
    await tx.companionCandidate.updateMany({
      where: {
        OR: [{ requesterId: userId }, { matchedUserId: userId }],
        status: { in: ["candidate", "pending_counterparty"] },
      },
      data: { status: "withdrawn", supportingEntryIds: "[]" },
    });
  }
  if (input.acceptsRequests === false) {
    await tx.companionCandidate.updateMany({
      where: {
        matchedUserId: userId,
        status: { in: ["candidate", "pending_counterparty"] },
      },
      data: { status: "withdrawn", supportingEntryIds: "[]" },
    });
  }
  return profile;
  });
}

export async function revokeCompanionAccess(userId: string) {
  return db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { companionConsent: false },
    });
    await tx.companionSafetyEvent.create({
      data: {
        actorUserId: userId,
        targetUserId: userId,
        type: "consent_revoked",
        reason: "사용자 동의 철회",
      },
    });
    await tx.companionProfile.updateMany({
      where: { userId },
      data: { enabled: false, acceptsRequests: false, disabledAt: new Date() },
    });
    const candidates = await tx.companionCandidate.updateMany({
      where: {
        OR: [{ requesterId: userId }, { matchedUserId: userId }],
        status: { in: ["candidate", "pending_counterparty"] },
      },
      data: { status: "withdrawn", supportingEntryIds: "[]" },
    });
    const connections = await tx.companionConnection.updateMany({
      where: {
        OR: [{ requesterId: userId }, { counterpartyId: userId }],
        status: "connected",
      },
      data: { status: "ended", endedAt: new Date(), endedBy: userId },
    });
    return {
      withdrawnCandidates: candidates.count,
      endedConnections: connections.count,
    };
  });
}

// ─── Candidate Generation ──────────────────────────────────────────────────────

/**
 * Deterministic, privacy-preserving companion candidate generator.
 *
 * - Requires requester to have companionConsent and an enabled profile.
 * - Only considers profiles with enabled=true AND acceptsRequests=true.
 * - Excludes requester/self, blocked users, and disabled profiles.
 * - Scores by overlapping topicTags + helpModes; caps at MAX_CANDIDATES.
 * - Returns empty when evidence is insufficient (zero overlap).
 * - Stores supportingEntryIds server-side; never returns them to the consumer.
 */
export async function generateCompanionCandidates(
  requesterId: string,
  requestedScope: "private" = "private",
): Promise<CandidateProjection[]> {
  if (!COMPANIONS_ENABLED) return [];
  // 1. Requester must have companion consent
  const requester = await db.user.findUnique({
    where: { id: requesterId },
    select: { companionConsent: true },
  });
  if (!requester?.companionConsent) return [];

  // 2. Requester must have an enabled profile
  const requesterProfile = await db.companionProfile.findUnique({
    where: { userId: requesterId },
  });
  if (!requesterProfile?.enabled) return [];
  if (requesterProfile.scopeKey !== requestedScope) return [];

  const requesterTags = safeSignalSet(requesterProfile.topicTags);
  const requesterModes = safeSignalSet(requesterProfile.helpModes);
  const supportingEntries = await db.reflectionEntry.findMany({
    where: { userId: requesterId, deletedAt: null },
    orderBy: { entryDate: "desc" },
    take: 3,
    select: { id: true },
  });
  if (supportingEntries.length === 0) return [];
  // The only currently supported audience is the explicit-consent pool.
  // Group and curated scopes remain closed until server-verifiable membership
  // data is available.
  if (requesterProfile.scopeKey !== "private") return [];

  // 3. Collect blocked user IDs (both directions)
  const blocks = await db.companionBlock.findMany({
    where: {
      OR: [{ blockerUserId: requesterId }, { blockedUserId: requesterId }],
    },
    select: { blockerUserId: true, blockedUserId: true },
  });
  const blockedUserIds = new Set<string>();
  for (const b of blocks) {
    if (b.blockerUserId === requesterId) blockedUserIds.add(b.blockedUserId);
    if (b.blockedUserId === requesterId) blockedUserIds.add(b.blockerUserId);
  }

  // 4. Find eligible profiles
  const userIdFilter: { not: string; notIn?: string[] } = {
    not: requesterId,
  };
  if (blockedUserIds.size > 0) {
    userIdFilter.notIn = [...blockedUserIds];
  }

  const eligibleProfiles = await db.companionProfile.findMany({
    where: {
      enabled: true,
      acceptsRequests: true,
      disabledAt: null,
      scopeKey: requesterProfile.scopeKey,
      userId: userIdFilter,
    },
    include: {
      user: {
        select: { companionConsent: true, displayName: true, name: true },
      },
    },
  });

  // Only include profiles whose users also have companionConsent
  const consentedProfiles = eligibleProfiles.filter(
    (p) => p.user.companionConsent,
  );

  if (consentedProfiles.length === 0) return [];

  // 5. Score by tag + mode overlap
  const scored = consentedProfiles.map((profile) => {
    const profileTags = safeSignalSet(profile.topicTags);
    const profileModes = safeSignalSet(profile.helpModes);

    const tagOverlap = [...requesterTags].filter((t) => profileTags.has(t));
    const modeOverlap = [...requesterModes].filter((m) => profileModes.has(m));

    const score = tagOverlap.length + modeOverlap.length;
    return { profile, score, tagOverlap, modeOverlap };
  });

  // 6. Filter insufficient evidence (zero overlap)
  const viable = scored.filter((s) => s.score > 0);
  if (viable.length === 0) return [];

  // 7. Sort by score desc, then by createdAt asc (older profiles first as tiebreaker)
  viable.sort((a, b) => b.score - a.score || a.profile.createdAt.getTime() - b.profile.createdAt.getTime());

  // 8. Cap at MAX_CANDIDATES
  const topCandidates = viable.slice(0, MAX_CANDIDATES);

  // 9. Build public signal labels from overlapping tags/modes
  const results: CandidateProjection[] = [];

  for (const { profile, tagOverlap, modeOverlap } of topCandidates) {
    const signalLabels = [...tagOverlap, ...modeOverlap];
    const reasonSummary = buildReasonSummary(signalLabels, profile.role);
    const previous = await db.companionCandidate.findUnique({
      where: { requesterId_matchedUserId: { requesterId, matchedUserId: profile.userId } },
      select: { status: true },
    });
    if (previous && ["rejected", "snoozed", "withdrawn", "expired"].includes(previous.status)) {
      continue;
    }

    // Upsert candidate record (idempotent)
    const candidate = await db.companionCandidate.upsert({
      where: {
        requesterId_matchedUserId: {
          requesterId,
          matchedUserId: profile.userId,
        },
      },
      create: {
        requesterId,
        matchedUserId: profile.userId,
        reasonSummary,
        signalLabels: JSON.stringify(signalLabels),
        supportingEntryIds: JSON.stringify(supportingEntries.map((entry) => entry.id)),
        modelVersion: GENERATOR_MODEL_VERSION,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      update: {
        reasonSummary,
        signalLabels: JSON.stringify(signalLabels),
        modelVersion: GENERATOR_MODEL_VERSION,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    results.push(serializeCandidate(candidate, profile));
  }

  return results;
}

export async function runCompanionMatch(
  requesterId: string,
  requestedScope: "private" = "private",
): Promise<{ runId: string; status: "succeeded" | "no_match" | "blocked" | "retryable"; candidates: CandidateProjection[] }> {
  const requester = await db.user.findUnique({
    where: { id: requesterId },
    select: { companionConsent: true, companionProfile: { select: { consentVersion: true } } },
  });
  const run = await db.companionMatchRun.create({
    data: {
      requesterId,
      scopeKey: requestedScope,
      generator: GENERATOR_MODEL_VERSION,
      consentVersion: requester?.companionProfile?.consentVersion ?? null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: COMPANIONS_ENABLED && requester?.companionConsent ? "running" : "blocked",
    },
  });
  if (!COMPANIONS_ENABLED || !requester?.companionConsent) {
    return { runId: run.id, status: "blocked", candidates: [] };
  }
  try {
    const candidates = await generateCompanionCandidates(requesterId, requestedScope);
    const safeCandidates = validateProviderResult(
      candidates.map((candidate) => ({
        profileId: candidate.id,
        signalLabels: candidate.signalLabels,
        reasonSummary: candidate.reasonSummary ?? "공개 프로필 신호 기반 제안",
      })),
    );
    const allowedIds = new Set(safeCandidates.map((candidate) => candidate.profileId));
    const filteredCandidates = candidates.filter((candidate) => allowedIds.has(candidate.id));
    const status = filteredCandidates.length ? "succeeded" : "no_match";
    await db.companionMatchRun.update({ where: { id: run.id }, data: { status } });
    return { runId: run.id, status, candidates: filteredCandidates };
  } catch {
    await db.companionMatchRun.update({ where: { id: run.id }, data: { status: "retryable" } });
    return { runId: run.id, status: "retryable", candidates: [] };
  }
}

export async function listCompanionCandidates(
  requesterId: string,
): Promise<CandidateProjection[]> {
  const viewer = await db.user.findUnique({
    where: { id: requesterId },
    select: { companionConsent: true, companionProfile: { select: { scopeKey: true } } },
  });
  if (!viewer?.companionConsent || viewer.companionProfile?.scopeKey !== "private") return [];
  const blocks = await db.companionBlock.findMany({
    where: {
      OR: [{ blockerUserId: requesterId }, { blockedUserId: requesterId }],
    },
    select: { blockerUserId: true, blockedUserId: true },
  });
  const blockedUserIds = new Set<string>();
  for (const block of blocks) {
    if (block.blockerUserId === requesterId) blockedUserIds.add(block.blockedUserId);
    if (block.blockedUserId === requesterId) blockedUserIds.add(block.blockerUserId);
  }
  const rows = await db.companionCandidate.findMany({
    where: {
      AND: [
        { OR: [{ requesterId }, { matchedUserId: requesterId }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        { status: { notIn: ["rejected", "snoozed", "withdrawn", "expired"] } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: MAX_CANDIDATES,
    include: {
      requester: {
        include: { companionProfile: true },
      },
      matchedUser: {
        include: { companionProfile: true },
      },
    },
  });
  return rows
    .filter((row) => row.requesterId === requesterId || row.status === "pending_counterparty")
    .filter((row) => {
      const other = row.requesterId === requesterId ? row.matchedUserId : row.requesterId;
      const otherProfile = row.requesterId === requesterId
        ? row.matchedUser.companionProfile
        : row.requester.companionProfile;
      return !blockedUserIds.has(other) &&
        Boolean(otherProfile?.enabled) &&
        Boolean(row.requesterId === requesterId
          ? row.matchedUser.companionConsent && row.matchedUser.companionProfile?.acceptsRequests
          : row.requester.companionConsent);
    })
    .map((row) =>
      serializeCandidate(
        row,
        {
          ...(row.requesterId === requesterId
            ? row.matchedUser.companionProfile
            : row.requester.companionProfile)!,
          user: row.requesterId === requesterId ? row.matchedUser : row.requester,
        },
      ),
    );
}

export async function decideCompanionCandidate(
  userId: string,
  candidateId: string,
  input: { decision: "accepted" | "rejected" | "snoozed" | "withdrawn"; reasonCode?: string },
) {
  const expiredCandidate = await db.companionCandidate.findUnique({
    where: { id: candidateId },
    select: { requesterId: true, matchedUserId: true, expiresAt: true },
  });
  if (
    expiredCandidate &&
    (expiredCandidate.requesterId === userId || expiredCandidate.matchedUserId === userId) &&
    expiredCandidate.expiresAt &&
    expiredCandidate.expiresAt <= new Date()
  ) {
    await db.companionCandidate.update({
      where: { id: candidateId },
      data: { status: "expired" },
    });
    throw new Error("이 동행 제안은 만료되었습니다.");
  }
  return db.$transaction(async (tx) => {
    const candidate = await tx.companionCandidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate || (candidate.requesterId !== userId && candidate.matchedUserId !== userId)) {
      throw new Error("동행 후보를 찾을 수 없습니다.");
    }
    if (input.decision === "withdrawn" && userId !== candidate.requesterId) {
      throw new Error("동행 요청을 철회할 권한이 없습니다.");
    }
    const existingDecision = await tx.companionDecision.findUnique({
      where: { candidateId_userId: { candidateId, userId } },
    });
    if (["rejected", "withdrawn", "expired", "ended", "blocked", "connected"].includes(candidate.status)) {
      if (existingDecision?.decision === input.decision) {
        return { decision: existingDecision, status: candidate.status };
      }
      throw new Error("이미 종료된 동행 제안입니다.");
    }

    const decision = await tx.companionDecision.upsert({
      where: { candidateId_userId: { candidateId, userId } },
      create: { candidateId, userId, decision: input.decision, reasonCode: input.reasonCode ?? null },
      update: { decision: input.decision, reasonCode: input.reasonCode ?? null },
    });
    const requesterDecision = await tx.companionDecision.findUnique({
      where: { candidateId_userId: { candidateId, userId: candidate.requesterId } },
    });
    const counterpartyDecision = await tx.companionDecision.findUnique({
      where: { candidateId_userId: { candidateId, userId: candidate.matchedUserId } },
    });
    const bothAccepted =
      requesterDecision?.decision === "accepted" &&
      counterpartyDecision?.decision === "accepted";
    const nextStatus = bothAccepted
      ? "connected"
      : input.decision === "rejected"
        ? "rejected"
        : input.decision === "withdrawn"
          ? "withdrawn"
          : input.decision === "accepted"
            ? "pending_counterparty"
            : candidate.status;
    const updated = await tx.companionCandidate.updateMany({
      where: {
        id: candidate.id,
        status: { notIn: ["rejected", "withdrawn", "expired", "ended", "blocked", "connected"] },
      },
      data: { status: nextStatus },
    });
    if (updated.count !== 1) throw new Error("동행 제안 상태가 이미 변경되었습니다.");

    if (bothAccepted) {
      const existing = await tx.companionConnection.findFirst({
        where: {
          OR: [
            { requesterId: candidate.requesterId, counterpartyId: candidate.matchedUserId },
            { requesterId: candidate.matchedUserId, counterpartyId: candidate.requesterId },
          ],
          status: "connected",
        },
      });
      if (!existing) {
        await tx.companionConnection.create({
          data: {
            candidateId: candidate.id,
            pairKey: [candidate.requesterId, candidate.matchedUserId].sort().join(":"),
            requesterId: candidate.requesterId,
            counterpartyId: candidate.matchedUserId,
            requesterAcceptedAt: requesterDecision!.updatedAt,
            counterpartyAcceptedAt: counterpartyDecision!.updatedAt,
          },
        });
      }
    }
    return { decision, status: nextStatus };
  });
}

export async function recordCompanionSafetyEvent(
  actorUserId: string,
  input: { targetUserId: string; connectionId?: string; type: "block" | "report" | "end"; reason?: string },
) {
  if (actorUserId === input.targetUserId) throw new Error("자기 자신을 대상으로 처리할 수 없습니다.");
  return db.$transaction(async (tx) => {
    if (input.type === "block") {
      const existingBlock = await tx.companionBlock.findUnique({
        where: {
          blockerUserId_blockedUserId: {
            blockerUserId: actorUserId,
            blockedUserId: input.targetUserId,
          },
        },
      });
      if (existingBlock) {
        const priorEvent = await tx.companionSafetyEvent.findFirst({
          where: {
            actorUserId,
            targetUserId: input.targetUserId,
            type: "block",
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, type: true },
        });
        return priorEvent ?? { id: existingBlock.id, type: "block" };
      }
    }
    if (input.connectionId) {
      const connection = await tx.companionConnection.findFirst({
        where: {
          id: input.connectionId,
          OR: [
            { requesterId: actorUserId, counterpartyId: input.targetUserId },
            { requesterId: input.targetUserId, counterpartyId: actorUserId },
          ],
          status: "connected",
        },
      });
      if (!connection) {
        if (input.type === "end") {
          const priorEvent = await tx.companionSafetyEvent.findFirst({
            where: {
              actorUserId,
              targetUserId: input.targetUserId,
              connectionId: input.connectionId,
              type: "end",
            },
            orderBy: { createdAt: "desc" },
            select: { id: true, type: true },
          });
          if (priorEvent) return priorEvent;
        }
        throw new Error("이 연결을 관리할 권한이 없습니다.");
      }
    }
    const event = await tx.companionSafetyEvent.create({
      data: {
        actorUserId,
        targetUserId: input.targetUserId,
        connectionId: input.connectionId ?? null,
        type: input.type,
        reason: input.reason?.trim() || null,
      },
    });
    if (input.type === "block") {
      await tx.companionBlock.upsert({
        where: { blockerUserId_blockedUserId: { blockerUserId: actorUserId, blockedUserId: input.targetUserId } },
        create: { blockerUserId: actorUserId, blockedUserId: input.targetUserId },
        update: {},
      });
      await tx.companionConnection.updateMany({
        where: {
          OR: [
            { requesterId: actorUserId, counterpartyId: input.targetUserId },
            { requesterId: input.targetUserId, counterpartyId: actorUserId },
          ],
          status: "connected",
        },
        data: { status: "blocked", endedAt: new Date(), endedBy: actorUserId },
      });
    }
    if (input.connectionId && (input.type === "block" || input.type === "end")) {
      await tx.companionConnection.updateMany({
        where: { id: input.connectionId, status: "connected" },
        data: { status: input.type === "block" ? "blocked" : "ended", endedAt: new Date(), endedBy: actorUserId },
      });
    }
    return { id: event.id, type: event.type };
  });
}

async function getOwnedConnection(userId: string, connectionId: string) {
  const connection = await db.companionConnection.findUnique({ where: { id: connectionId } });
  if (!connection || (connection.requesterId !== userId && connection.counterpartyId !== userId) || connection.status !== "connected") {
    throw new Error("연결된 대화를 찾을 수 없습니다.");
  }
  const otherUserId = connection.requesterId === userId ? connection.counterpartyId : connection.requesterId;
  const blocked = await db.companionBlock.findFirst({
    where: {
      OR: [
        { blockerUserId: userId, blockedUserId: otherUserId },
        { blockerUserId: otherUserId, blockedUserId: userId },
      ],
    },
  });
  if (blocked) throw new Error("차단된 연결입니다.");
  return connection;
}

export async function listCompanionMessages(userId: string, connectionId: string) {
  await getOwnedConnection(userId, connectionId);
  return db.companionMessage.findMany({
    where: { connectionId, moderationStatus: { not: "flagged" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, senderUserId: true, body: true, createdAt: true },
  });
}

export async function sendCompanionMessage(userId: string, connectionId: string, body: string) {
  await getOwnedConnection(userId, connectionId);
  const trimmed = body.trim();
  if (CONTACT_PATTERN.test(trimmed)) {
    throw new Error("안전을 위해 연락처와 외부 링크는 아직 공유할 수 없습니다.");
  }
  if (CRISIS_PATTERN.test(trimmed)) {
    throw new Error("지금 많이 힘든 상태라면 혼자 버티지 말고 지역 응급·상담기관에 바로 도움을 요청해 주세요.");
  }
  return db.companionMessage.create({
    data: {
      connectionId,
      senderUserId: userId,
      body: trimmed,
      moderationStatus: MODERATION_PATTERN.test(trimmed) ? "flagged" : "clear",
    },
    select: { id: true, senderUserId: true, body: true, createdAt: true },
  });
}

function buildReasonSummary(
  signalLabels: string[],
  role: string | null,
): string {
  if (signalLabels.length === 0) return "공통 관심사를 찾지 못했지만 프로필이 일치합니다.";

  const labelText = signalLabels.slice(0, 3).join(", ");
  const roleText = role ? ` (${role})` : "";
  return `공통 관심사: ${labelText}${roleText}`;
}
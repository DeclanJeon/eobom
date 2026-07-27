import { db } from "@/lib/db";
import {
  ACTION_STATUS_LABEL,
  isActionStatus,
  OPEN_ACTION_STATUSES,
  type ActionStatus,
} from "@/lib/action-status";

export {
  ACTION_STATUSES,
  ACTION_STATUS_LABEL,
  OPEN_ACTION_STATUSES,
  isActionStatus,
  type ActionStatus,
} from "@/lib/action-status";

export function serializeActionStep(step: {
  id: string;
  body: string;
  status: string;
  reflectionOnResult: string | null;
  sourceEntryId: string | null;
  targetDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sourceEntry?: {
    id: string;
    title: string | null;
    entryDate: Date;
  } | null;
}) {
  const status = isActionStatus(step.status) ? step.status : "pending";
  return {
    id: step.id,
    body: step.body,
    status,
    statusLabel: ACTION_STATUS_LABEL[status],
    reflectionOnResult: step.reflectionOnResult,
    sourceEntryId: step.sourceEntryId,
    targetDate: step.targetDate,
    completedAt: step.completedAt,
    createdAt: step.createdAt,
    updatedAt: step.updatedAt,
    sourceEntry: step.sourceEntry
      ? {
          id: step.sourceEntry.id,
          title: step.sourceEntry.title,
          entryDate: step.sourceEntry.entryDate,
        }
      : null,
  };
}

/** Create ActionStep rows for entries that have action text but no step yet. */
async function backfillActionStepsFromEntries(userId: string) {
  const entries = await db.reflectionEntry.findMany({
    where: {
      userId,
      deletedAt: null,
      actionStep: { not: null },
    },
    select: { id: true, actionStep: true, entryDate: true },
    orderBy: { entryDate: "desc" },
    take: 40,
  });

  for (const entry of entries) {
    const body = entry.actionStep?.trim();
    if (!body) continue;
    const exists = await db.actionStep.findFirst({
      where: { userId, sourceEntryId: entry.id },
      select: { id: true },
    });
    if (exists) continue;
    await db.actionStep.create({
      data: {
        userId,
        sourceEntryId: entry.id,
        body,
        status: "pending",
        createdAt: entry.entryDate,
      },
    });
  }
}

export async function listOpenActionSteps(userId: string, limit = 5) {
  await backfillActionStepsFromEntries(userId);

  const steps = await db.actionStep.findMany({
    where: {
      userId,
      status: { in: OPEN_ACTION_STATUSES },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sourceEntry: {
        select: { id: true, title: true, entryDate: true, deletedAt: true },
      },
    },
  });

  return steps
    .filter((s) => !s.sourceEntry || !s.sourceEntry.deletedAt)
    .map((s) =>
      serializeActionStep({
        ...s,
        sourceEntry: s.sourceEntry
          ? {
              id: s.sourceEntry.id,
              title: s.sourceEntry.title,
              entryDate: s.sourceEntry.entryDate,
            }
          : null,
      }),
    );
}

export async function updateActionStep(
  userId: string,
  id: string,
  input: { status?: ActionStatus; reflectionOnResult?: string | null },
) {
  const existing = await db.actionStep.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new Error("결단을 찾을 수 없습니다.");

  const nextStatus =
    input.status ??
    (isActionStatus(existing.status) ? existing.status : "pending");
  const reflection =
    input.reflectionOnResult !== undefined
      ? input.reflectionOnResult?.trim() || null
      : existing.reflectionOnResult;

  const closes = nextStatus === "stepped" || nextStatus === "released";

  const updated = await db.actionStep.update({
    where: { id },
    data: {
      status: nextStatus,
      reflectionOnResult: reflection,
      completedAt: closes ? existing.completedAt ?? new Date() : null,
    },
    include: {
      sourceEntry: {
        select: { id: true, title: true, entryDate: true },
      },
    },
  });

  return serializeActionStep(updated);
}

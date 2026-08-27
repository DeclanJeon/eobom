import { db } from "@/lib/db";

export async function recordContinuityMoment(input: {
  userId: string;
  source: "keyring" | "today";
  context?: string | null;
  reaction?: string | null;
  sourceCheckinId?: string | null;
}) {
  return db.moment.create({
    data: {
      userId: input.userId,
      source: input.source,
      sourceCheckinId: input.sourceCheckinId ?? null,
      context: input.context ?? null,
      reaction: input.reaction ?? null,
    },
  });
}

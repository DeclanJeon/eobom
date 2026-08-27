export type MomentSource = "keyring" | "today" | "entry" | "resurface";

export type ContinuityMoment = {
  id: string;
  userId: string;
  source: MomentSource;
  context: string | null;
  verseKey: string | null;
  reaction: string | null;
  oneLine: string | null;
  sourceEntryId: string | null;
  promotedEntryId: string | null;
  happenedAt: Date;
};

type CheckinProjection = {
  id: string;
  userId: string;
  cardKey: string;
  reaction: string | null;
  oneLine: string | null;
  entryId: string | null;
  createdAt: Date;
};

/** Projects only known DailyCheckIn card kinds into the continuity domain. */
export function projectCheckinToMoment(checkin: CheckinProjection): ContinuityMoment | null {
  const [kind, sourceId] = checkin.cardKey.split(":", 2);
  if ((kind !== "scripture" && kind !== "memory") || !sourceId) return null;

  const isMemory = kind === "memory";
  // scripture cardKey는 scripture:{dateKey} 형태이므로 verse 참조가 아니다.
  // 가짜 verseKey를 저장하지 않고 null로 둔다 — 실제 성구 참조는 별도 해소 필요.
  return {
    id: checkin.id,
    userId: checkin.userId,
    source: isMemory ? "resurface" : "today",
    context: null,
    verseKey: null,
    reaction: checkin.reaction,
    oneLine: checkin.oneLine,
    sourceEntryId: isMemory ? sourceId : null,
    promotedEntryId: checkin.entryId,
    happenedAt: checkin.createdAt,
  };
}

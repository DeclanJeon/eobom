/** Open / soft statuses — never “failed”. */
export const ACTION_STATUSES = [
  "pending",
  "walking",
  "stepped",
  "released",
] as const;

export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  pending: "열린 결단",
  walking: "아직 가는 중",
  stepped: "한 걸음 뗐음",
  released: "내려놓음",
};

/** Statuses that still surface on Today as a gentle reminder. */
export const OPEN_ACTION_STATUSES: ActionStatus[] = ["pending", "walking"];

export function isActionStatus(value: unknown): value is ActionStatus {
  return (
    typeof value === "string" &&
    (ACTION_STATUSES as readonly string[]).includes(value)
  );
}

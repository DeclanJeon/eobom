import { describe, expect, test } from "bun:test";
import {
  ACTION_STATUS_LABEL,
  isActionStatus,
  OPEN_ACTION_STATUSES,
} from "../src/lib/action-status";

describe("action steps", () => {
  test("accepts only known statuses", () => {
    expect(isActionStatus("pending")).toBe(true);
    expect(isActionStatus("walking")).toBe(true);
    expect(isActionStatus("stepped")).toBe(true);
    expect(isActionStatus("released")).toBe(true);
    expect(isActionStatus("failed")).toBe(false);
    expect(isActionStatus("done")).toBe(false);
  });

  test("open statuses never include closed ones", () => {
    expect(OPEN_ACTION_STATUSES).toEqual(["pending", "walking"]);
    expect(OPEN_ACTION_STATUSES.includes("stepped" as never)).toBe(false);
  });

  test("labels avoid judgment language", () => {
    const joined = Object.values(ACTION_STATUS_LABEL).join(" ");
    expect(joined.includes("실패")).toBe(false);
    expect(joined.includes("미완")).toBe(false);
    expect(ACTION_STATUS_LABEL.released).toBe("내려놓음");
  });
});

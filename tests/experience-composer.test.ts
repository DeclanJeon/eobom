import { describe, expect, test } from "bun:test";
import { composeExperience } from "../src/lib/experience-composer";

describe("experience composer", () => {
  test("new users always receive scripture", () => {
    const result = composeExperience({
      surface: "keyring",
      lifecycle: "new",
      dateKey: "2026-08-25",
      timeCapsule: [{ sourceType: "entry", sourceId: "e1", display: "지난 기록" }],
    });
    expect(result.kind).toBe("scripture");
  });

  test("returning keyring users receive a ranked memory", () => {
    const result = composeExperience({
      surface: "keyring",
      lifecycle: "returning",
      dateKey: "2026-08-25",
      timeCapsule: [
        { sourceType: "entry", sourceId: "e2", anchorDays: 100, distanceDays: 8, display: "먼 기록" },
        { sourceType: "entry", sourceId: "e1", anchorDays: 30, distanceDays: 2, display: "가까운 기록" },
      ],
    });
    expect(result.kind).toBe("memory");
    expect(result.candidate?.sourceId).toBe("e1");
  });
});

import { describe, expect, test } from "bun:test";
import { displayCrossRef } from "../src/lib/bible/crossrefs";

describe("displayCrossRef", () => {
  test("korean book name + chapter:verse", () => {
    expect(displayCrossRef({ targetCode: "JOH", targetChapter: 1, targetStart: 1, targetEnd: 3, targetRef: "JOH 1:1-3" })).toBe("요한복음 1:1-3");
  });

  test("range", () => {
    expect(displayCrossRef({ targetCode: "2CH", targetChapter: 5, targetStart: 1, targetEnd: 14, targetRef: "2CH 5:1-14" })).toBe("역대하 5:1-14");
  });

  test("single verse", () => {
    expect(displayCrossRef({ targetCode: "ISA", targetChapter: 45, targetStart: 18, targetEnd: 18, targetRef: "ISA 45:18" })).toBe("이사야 45:18");
  });

  test("fallback to raw label on unknown book", () => {
    expect(displayCrossRef({ targetCode: "TBT", targetChapter: 1, targetStart: 1, targetEnd: 1, targetRef: "TBT 1:1" })).toBe("TBT 1:1");
  });

  test("fallback on malformed numbers", () => {
    expect(displayCrossRef({ targetCode: "JOH", targetChapter: 3, targetStart: 16, targetEnd: 16, targetRef: "JOH 3:16" })).toBe("요한복음 3:16");
    expect(displayCrossRef({ targetCode: "JOH", targetChapter: 0, targetStart: 16, targetEnd: 0, targetRef: "JOH 3:16" })).toBe("JOH 3:16");
    expect(displayCrossRef({ targetCode: "JOH", targetChapter: 3, targetStart: 16, targetEnd: 0, targetRef: "JOH 3:16" })).toBe("요한복음 3:16");
  });

  test("end equal start treated as single", () => {
    expect(displayCrossRef({ targetCode: "REV", targetChapter: 4, targetStart: 11, targetEnd: 11, targetRef: "REV 4:11" })).toBe("요한계시록 4:11");
  });
});

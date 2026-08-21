import { describe, expect, test } from "bun:test";
import {
  selectCardPolicy,
  cardKeyFor,
  rankTimeCapsuleCandidates,
  dedupeByEntryId,
  type CardCandidate,
} from "../src/lib/select-card";

function cand(over: Partial<CardCandidate> & { sourceId: string }): CardCandidate {
  return { sourceType: "entry", display: "기록", ...over };
}

describe("cardKeyFor", () => {
  test("scripture:dateKey / memory:entryId 형식 (D2)", () => {
    expect(cardKeyFor("scripture", "2026-08-21", "2026-08-21")).toBe("scripture:2026-08-21");
    expect(cardKeyFor("memory", "clyx123", "2026-08-21")).toBe("memory:clyx123");
  });
});

describe("rankTimeCapsuleCandidates (R-B1)", () => {
  test("anchor 30 → 100 → 365 우선순위, 동일 anchor는 최근접 우선", () => {
    const c365 = cand({ sourceId: "a", anchorDays: 365, distanceDays: 2 });
    const c100 = cand({ sourceId: "b", anchorDays: 100, distanceDays: 1 });
    const c30 = cand({ sourceId: "c", anchorDays: 30, distanceDays: 3 });
    const c30near = cand({ sourceId: "d", anchorDays: 30, distanceDays: 0 });
    const ranked = rankTimeCapsuleCandidates([c365, c100, c30, c30near]);
    expect(ranked.map((c) => c.sourceId)).toEqual(["d", "c", "b", "a"]);
  });

  test("anchorDays 없는 후보는 distance 기준으로만", () => {
    const far = cand({ sourceId: "x", distanceDays: 10 });
    const near = cand({ sourceId: "y", distanceDays: 1 });
    const ranked = rankTimeCapsuleCandidates([far, near]);
    expect(ranked.map((c) => c.sourceId)).toEqual(["y", "x"]);
  });
});

describe("dedupeByEntryId", () => {
  test("같은 기록 중복 제거 — 첫 번째 유지", () => {
    const a = cand({ sourceId: "e1", entryId: "e1" });
    const b = cand({ sourceId: "e1", entryId: "e1", display: "다른 표시" });
    const c = cand({ sourceId: "e2", entryId: "e2" });
    const out = dedupeByEntryId([a, b, c]);
    expect(out.map((x) => x.entryId)).toEqual(["e1", "e2"]);
    expect(out[0]!.display).toBe("기록");
  });
});

describe("selectCardPolicy (GATE-5/R-B1)", () => {
  const dateKey = "2026-08-21";

  test("keyring: 타임캡슐 우선 → 말씀까지 폴백", () => {
    const tc = cand({ sourceId: "e30", entryId: "e30", anchorDays: 30, distanceDays: 2 });
    const sel = selectCardPolicy({ surface: "keyring", dateKey, timeCapsule: [tc] });
    expect(sel.kind).toBe("memory");
    expect(sel.cardKey).toBe("memory:e30");
    expect(sel.sourceType).toBe("entry");
  });

  test("keyring: 타임캡슐 없으면 과거의 오늘 → 지난주 → 리액션 순", () => {
    const past = cand({ sourceId: "p1", entryId: "p1" });
    const s1 = selectCardPolicy({ surface: "keyring", dateKey, pastToday: [past] });
    expect(s1.cardKey).toBe("memory:p1");

    const week = cand({ sourceId: "w1", entryId: "w1" });
    const s2 = selectCardPolicy({ surface: "keyring", dateKey, lastWeek: [week] });
    expect(s2.cardKey).toBe("memory:w1");

    const react = cand({ sourceId: "r1", entryId: "r1", sourceType: "reaction" });
    const s3 = selectCardPolicy({ surface: "keyring", dateKey, reactions: [react] });
    expect(s3.cardKey).toBe("memory:r1");
  });

  test("keyring: 후보 없으면 말씀", () => {
    const sel = selectCardPolicy({ surface: "keyring", dateKey });
    expect(sel.kind).toBe("scripture");
    expect(sel.cardKey).toBe("scripture:2026-08-21");
  });

  test("today: 항상 말씀 우선 (Memory는 보조)", () => {
    const tc = cand({ sourceId: "e30", entryId: "e30", anchorDays: 30 });
    const sel = selectCardPolicy({ surface: "today", dateKey, timeCapsule: [tc] });
    expect(sel.kind).toBe("scripture");
    expect(sel.cardKey).toBe("scripture:2026-08-21");
  });

  test("keyring: 타임캡슐 anchor 정렬이 반영된다 (30 우선)", () => {
    const c365 = cand({ sourceId: "e365", entryId: "e365", anchorDays: 365, distanceDays: 0 });
    const c30 = cand({ sourceId: "e30", entryId: "e30", anchorDays: 30, distanceDays: 5 });
    const sel = selectCardPolicy({
      surface: "keyring",
      dateKey,
      timeCapsule: [c365, c30],
    });
    expect(sel.cardKey).toBe("memory:e30");
  });
});

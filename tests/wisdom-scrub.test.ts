import { describe, expect, test } from "bun:test";
import {
  scrubMirrorText,
  FORBIDDEN_WISDOM_PATTERNS,
} from "../src/lib/content-scrub";
import { buildSituationPrompt } from "../src/lib/wisdom/prompt-builder";
import { resolveSituationContext } from "../src/lib/wisdom/classifier";
import type { SituationContext } from "../src/lib/wisdom/types";

describe("FORBIDDEN_WISDOM_PATTERNS blocks 동양 철학 용어", () => {
  const forbiddenTerms = [
    "주역",
    "괘사",
    "괘상",
    "효사",
    "음양",
    "군자",
    "소인",
    "乾",
    "坤",
    "震",
    "巽",
    "坎",
    "離",
    "艮",
    "兌",
    "태극",
    "64괘",
    "육십사괘",
    "점괘",
    "길흉",
  ];

  for (const term of forbiddenTerms) {
    test(`blocks "${term}"`, () => {
      const input = `이 기록에서 ${term}의 의미를 찾아봅니다.`;
      const output = scrubMirrorText(input);
      expect(output).not.toContain(term);
    });
  }

  test("preserves normal christian language", () => {
    const input = "하나님의 은혜 안에서 기다림의 시간을 보냈습니다.";
    const output = scrubMirrorText(input);
    expect(output).toBe(input);
  });

  test("preserves common Korean words containing 효", () => {
    const input = "효과와 효율, 효도에 대해 기록했습니다.";
    expect(scrubMirrorText(input)).toBe(input);
  });

  test("can disable wisdom patterns via option", () => {
    const input = "주역의 괘를 공부했습니다.";
    const output = scrubMirrorText(input, { includeWisdomPatterns: false });
    expect(output).toContain("주역");
  });
});

describe("buildSituationPrompt", () => {
  test("returns empty string for null context", () => {
    expect(buildSituationPrompt(null)).toBe("");
  });

  test("contains christian reflection language and structural elements", () => {
    const ctx: SituationContext = {
      primary: {
        id: "S03",
        archetype: "forming",
        label: "시작의 진통",
        theme: "growth",
        structure: {
          image: "구름과 우레가 만나지만 아직 비가 내리지 않는 형국",
          dynamic: "움직이려 하지만 위가 막고 있어 조건이 갖춰질 때까지 경륜을 짜는 때",
          posture: "서두르지 않되 방향을 잃지 않고 준비를 계속하는 인내",
        },
        phases: [
          {
            stage: "early",
            signal: "아직 기반이 없어 조급해짐",
            caution: "준비 없이 나서면 힘을 소진함",
            reflection: "하나님이 이 기다림을 통해 무엇을 준비시키고 계실까?",
          },
        ],
        guidance: {
          coreQuestion: "지금 내가 경륜해야 할 것은 무엇인가?",
          avoidPattern: "조건 미비 상태에서 무리한 출발",
          embracePattern: "작은 것부터 질서를 세우는 꾸준함",
        },
        transitions: {
          from: ["S01"],
          to: ["S04"],
          transitionQuestion: "이 진통이 지나면 무엇을 배우는가?",
        },
        scripturalResonance: ["창세기 1장"],
      },
      theme: "growth",
      phase: "early",
      reasoning: "기록에서 시작의 막막함이 반복됨",
    };

    const prompt = buildSituationPrompt(ctx);
    expect(prompt).toContain("내부 상황 인식 지침");
    expect(prompt).toContain("시작의 진통");
    expect(prompt).toContain("하나님이 이 기다림을 통해");
    // prompt-builder의 지시문에는 금지 용어가 "사용하지 말라"는 예시로 등장하므로,
    // 비노출 검증은 scrubMirrorText(AI 출력)에서 수행한다.
    // 여기서는 구조적 요소만 확인.
    expect(prompt).toContain("핵심 질문");
    expect(prompt).toContain("피할 패턴");
    expect(prompt).toContain("취할 패턴");
});
});

describe("resolveSituationContext", () => {
  test("returns null for primary=none", () => {
    expect(
      resolveSituationContext({
        primary: "none",
        theme: "growth",
        phase: "early",
        reasoning: "",
      }),
    ).toBeNull();
  });

  test("returns null for empty primary", () => {
    expect(
      resolveSituationContext({
        primary: "",
        theme: "growth",
        phase: "early",
        reasoning: "",
      }),
    ).toBeNull();
  });

  test("returns null for unknown id", () => {
    expect(
      resolveSituationContext({
        primary: "S999",
        theme: "growth",
        phase: "early",
        reasoning: "",
      }),
    ).toBeNull();
  });
});

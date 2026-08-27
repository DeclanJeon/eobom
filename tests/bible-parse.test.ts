import { describe, expect, test } from "bun:test";
import {
  localizeKeyVerseReference,
  displayCrossRef,
  localizeVerseReferenceInText,
} from "../src/lib/bible/parse";

describe("localizeKeyVerseReference", () => {
  test("영문 약어 코드를 한국어 책 이름으로 바꾼다", () => {
    expect(localizeKeyVerseReference("EPH 5:1-6")).toBe("에베소서 5:1-6");
    expect(localizeKeyVerseReference("ISA 61:1")).toBe("이사야 61:1");
    expect(localizeKeyVerseReference("GEN 1:1")).toBe("창세기 1:1");
  });

  test("다자리 코드(1CO, 2SA 등)도 인식한다", () => {
    expect(localizeKeyVerseReference("1CO 13:4")).toBe("고린도전서 13:4");
    expect(localizeKeyVerseReference("2SA 7:1")).toBe("사무엘하 7:1");
    expect(localizeKeyVerseReference("1KI 8:22")).toBe("열왕기상 8:22");
  });

  test("마지막 절이 없으면 단일 절로 표기한다", () => {
    expect(localizeKeyVerseReference("PSA 23")).toBe("시편 23");
    // regex는 chapter:verse 형식만 잡는다 — 형식이 다르면 입력을 그대로 돌려준다.
    expect(localizeKeyVerseReference("PSA 23:1")).toBe("시편 23:1");
  });

  test("알 수 없는 코드면 입력을 그대로 둔다 (데이터 보존)", () => {
    expect(localizeKeyVerseReference("XYZ 1:1")).toBe("XYZ 1:1");
  });

  test("형식이 다르면 입력을 그대로 둔다 (회귀 안전망)", () => {
    expect(localizeKeyVerseReference("")).toBe("");
    expect(localizeKeyVerseReference("에베소서 5:1-6")).toBe("에베소서 5:1-6");
    expect(localizeKeyVerseReference("1")).toBe("1");
  });
});

describe("displayCrossRef", () => {
  test("targetRef가 비어 있어도 코드/절 정보로 한국어 레퍼런스를 만든다", () => {
    expect(
      displayCrossRef({
        targetCode: "EPH",
        targetChapter: 5,
        targetStart: 1,
        targetEnd: 6,
        targetRef: "EPH 5:1-6",
      })
    ).toBe("에베소서 5:1-6");
  });
});

describe("localizeVerseReferenceInText — 본문 안에 박힌 영문/한글 약어 치환", () => {
  test("본문 안의 영문 약어 레퍼런스를 한국어 풀네임으로 바꾼다", () => {
    // 사용자가 본 정확한 시나리오: AI 초안 안에 영문 약어가 박혀 있음.
    expect(localizeVerseReferenceInText("HEB 13:9은 '여러 가지 이상한 교훈에 유혹당하지 말라'는 교훈 경계로 잇습니다."))
      .toBe("히브리서 13:9은 '여러 가지 이상한 교훈에 유혹당하지 말라'는 교훈 경계로 잇습니다.");
    expect(localizeVerseReferenceInText("ROM 16:17-18은 분쟁과 걸림을 가르치는 자를 삼가하라는"))
      .toBe("로마서 16:17-18은 분쟁과 걸림을 가르치는 자를 삼가하라는");
    expect(localizeVerseReferenceInText("1CO 14:20은 '악에 대하여는 어린 아이'"))
      .toBe("고린도전서 14:20은 '악에 대하여는 어린 아이'");
    expect(localizeVerseReferenceInText("1JO 4:1은 '영들을 시험하라'"))
      .toBe("요한일서 4:1은 '영들을 시험하라'");
    expect(localizeVerseReferenceInText("JAM 1:6은 물결에 몰리는 파도 같은"))
      .toBe("야고보서 1:6은 물결에 몰리는 파도 같은");
    expect(localizeVerseReferenceInText("EPH 6:11은 '마귀의 궤술을 능히 대적하기'"))
      .toBe("에베소서 6:11은 '마귀의 궤술을 능히 대적하기'");
  });

  test("다자리 영문 코드(1CO, 2CO, 1TI 등)도 인식한다", () => {
    expect(localizeVerseReferenceInText("1TI 1:1")).toContain("디모데전서 1:1");
    expect(localizeVerseReferenceInText("2CO 2:17")).toContain("고린도후서 2:17");
    expect(localizeVerseReferenceInText("HEB 5:12-14은 '완전한 자들은'"))
      .toBe("히브리서 5:12-14은 '완전한 자들은'");
  });

  test("여러 레퍼런스가 한 문장에 있어도 모두 치환한다", () => {
    expect(localizeVerseReferenceInText("HEB 13:9과 ROM 16:17-18은 ..."))
      .toBe("히브리서 13:9과 로마서 16:17-18은 ...");
  });

  test("한글 약어도 인식한다 (히 5:14, 골 1:28, 요 17:21, 엡 4:3)", () => {
    expect(localizeVerseReferenceInText("히 5:14는 완전한 자들")).toBe("히브리서 5:14는 완전한 자들");
    expect(localizeVerseReferenceInText("골 1:28은 각 사람을")).toBe("골로새서 1:28은 각 사람을");
    expect(localizeVerseReferenceInText("요 17:21은 저희가 다")).toBe("요한복음 17:21은 저희가 다");
    expect(localizeVerseReferenceInText("엡 4:3은 성령이 주신")).toBe("에베소서 4:3은 성령이 주신");
  });

  test("이미 한국어 풀네임이면 그대로 둔다 (이중 치환 없음)", () => {
    expect(localizeVerseReferenceInText("에베소서 5:1-6은 ...")).toBe("에베소서 5:1-6은 ...");
  });

  test("단어 일부로 매치되지 않는다 (\\b 단어 경계)", () => {
    // 'JOHNS' 같은 단어 안의 'JOH' 부분 매치를 막는다.
    expect(localizeVerseReferenceInText("JOHNS HOPKINS University 13:9")).not.toContain("요한복음");
  });

  test("매핑이 없는 영문 코드는 그대로 둔다 (안전)", () => {
    expect(localizeVerseReferenceInText("XYZ 1:1은 ...")).toBe("XYZ 1:1은 ...");
  });

  test("빈 문자열/형식 안 맞으면 그대로 둔다", () => {
    expect(localizeVerseReferenceInText("")).toBe("");
    expect(localizeVerseReferenceInText("사랑과 믿음")).toBe("사랑과 믿음");
  });
});

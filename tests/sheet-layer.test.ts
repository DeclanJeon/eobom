import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("Sheet layer contract", () => {
  test("keeps overlay below content but above app chrome", () => {
    const source = readFileSync("src/components/ui/sheet.tsx", "utf8");
    expect(source).toContain("z-[90]");
    expect(source).toContain("z-[100]");
    expect(source.indexOf("z-[90]")).toBeLessThan(source.indexOf("z-[100]"));
  });
});

describe("Scripture detail modal contract", () => {
  const modal = readFileSync("src/components/today/scripture-detail-modal.tsx", "utf8");
  const css = readFileSync("src/app/globals.css", "utf8");

  test("모달은 overlay(z-90)보다 높은 z-index(100)를 content에 둔다", () => {
    // overlay는 tailwind z-[90] 클래스로, content는 globals.css의 .scripture-modal
    // 규칙(z-index: 100)으로 잡혀 있다. 두 위치에서 모두 확인.
    expect(modal).toMatch(/scripture-modal__overlay[^"]*z-\[90\]/);
    expect(css).toMatch(/\.scripture-modal\s*\{[^}]*z-index:\s*100/);
  });

  test("body scroll lock — 모달이 떠 있는 동안 뒤 페이지를 잠근다", () => {
    expect(modal).toContain('document.body.style.overflow = "hidden"');
    // 원복도 보장
    expect(modal).toContain("document.body.style.overflow = prev");
  });

  test("CSS에서도 모달 open 상태의 body overflow를 잠근다", () => {
    // 모달 컴포넌트가 portal로 mount되기 전이라도 :has 셀렉터로 잡힌다.
    expect(css).toMatch(/body:has\(\.scripture-modal\[data-state="open"\]\)/);
  });

  test("single-pane — 각 섹션은 activeTab과 일치할 때만 보인다 (hidden 토글)", () => {
    // 사용자가 탭을 눌렀을 때 그 탭의 컨텐츠만 보여야 한다. 컨테이너 안에
    // 모든 섹션을 다 두면 짧은 컨테이너에서 어떤 섹션도 viewport에 다 안
    // 들어오는 회귀가 발생하므로, hidden 속성으로 활성 섹션만 렌더한다.
    expect(modal).toMatch(/id="modal-context"[^>]*hidden=\{safeActiveTab !== "context"\}/);
    expect(modal).toMatch(/id="modal-refs"[^>]*hidden=\{safeActiveTab !== "refs"\}/);
    expect(modal).toMatch(/id="modal-story"[^>]*hidden=\{safeActiveTab !== "story"\}/);
  });

  test("탭 전환 시 컨테이너 스크롤이 처음으로 돌아간다", () => {
    // 새 섹션이 위에서부터 자연스럽게 보이도록.
    expect(modal).toMatch(/handleTabClick[\s\S]{0,400}scrollTo\(\s*\{\s*top:\s*0/);
  });

  test("scroll-spy는 의도적으로 비활성 (handleScroll은 no-op)", () => {
    // 컨테이너가 짧을 때 scroll-spy line이 maxTop에 못 미치면 activeTab이
    // 사용자가 본 섹션과 어긋난다. handleScroll 본문이 비어 있어야 한다.
    const handleIdx = modal.indexOf("const handleScroll");
    const handleEnd = modal.indexOf("};", handleIdx);
    const handleBody = modal.slice(handleIdx, handleEnd);
    // 본문이 있더라도 실질 로직이 없어야 함 (setActiveTab, setActive 등 호출 없음)
    expect(handleBody).not.toMatch(/setActive/);
  });

  test("tablist/tab role — 보조기술이 탭 구조를 인지한다", () => {
    expect(modal).toContain('role="tablist"');
    expect(modal).toContain('role="tab"');
    expect(modal).toContain('aria-selected=');
    expect(modal).toContain('aria-controls=');
  });
});

describe("Scripture modal mobile layout", () => {
  const css = readFileSync("src/app/globals.css", "utf8");

  test("좁은 화면(≤520px)에서는 모달이 화면 가득 차게 펼쳐진다", () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*520px\)/);
    // 컨테이너 너비/높이 모두 viewport 기준으로 재정의되어야 한다.
    expect(css).toMatch(/@media\s*\(max-width:\s*520px\)[\s\S]{0,400}width:\s*100vw/);
  });

  test("스크롤 컨테이너는 scroll-padding을 둬서 sticky 헤더에 가려지지 않는다", () => {
    expect(css).toMatch(/scripture-modal__scroll[\s\S]{0,400}scroll-padding-top/);
  });

  test("데스크톱 모달은 더 이상 46rem에 묶이지 않고 viewport 90vh까지 자란다", () => {
    // 46rem 한계는 컨테이너를 작게 만들어 마지막 섹션이 잘리는 원인이었다.
    expect(css).toMatch(/\.scripture-modal\s*\{[^}]*height:\s*min\(\s*calc\(100vh\s*-\s*2rem\),\s*90vh\s*\)/);
  });
});

describe("Scripture modal typography & contrast", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const modal = readFileSync("src/components/today/scripture-detail-modal.tsx", "utf8");

  test("모달 내부 카드/라벨/본문 공용 클래스가 정의되어 있다", () => {
    // 컴포넌트가 tailwind inline 클래스로 한 두 곳을 단발성으로 두는 회귀를 막기
    // 위해, 모달 안에서 쓰는 톤은 globals.css에 토큰으로 묶어 둔다.
    expect(css).toMatch(/\.scripture-card\s*\{/);
    expect(css).toMatch(/\.scripture-card--dashed\s*\{/);
    expect(css).toMatch(/\.scripture-label\s*\{/);
    expect(css).toMatch(/\.scripture-label--gold\s*\{/);
    expect(css).toMatch(/\.scripture-label--leaf\s*\{/);
    expect(css).toMatch(/\.scripture-h4\s*\{/);
    expect(css).toMatch(/\.scripture-body\s*\{/);
    expect(css).toMatch(/\.scripture-h3\s*\{/);
    expect(css).toMatch(/\.scripture-bullet\s*\{/);
    expect(css).toMatch(/\.scripture-muted\s*\{/);
  });

  test("본문 폰트 크기는 모바일에서도 최소 16px이다 (가독성)", () => {
    // 15~16px 사이에서 흔들리던 것을 단일 토큰으로 묶어 회귀를 방지.
    expect(css).toMatch(/\.scripture-body\s*\{[^}]*font-size:\s*16\.5px/);
  });

  test("라벨(배경/내용/관찰/인물/참조/서사)은 11.5px + uppercase로 통일", () => {
    expect(css).toMatch(/\.scripture-label\s*\{[^}]*font-size:\s*11\.5px/);
    expect(css).toMatch(/\.scripture-eyebrow\s*\{[^}]*text-transform:\s*uppercase/);
  });

  test("비활성 탭의 contrast가 충분하다 (보더 + 텍스트 톤이 진해짐)", () => {
    // 회색 톤이 옅었던 비활성 탭이 단단한 보더(#C7B9A3) + 진한 텍스트
    // (#3F3933)로 바뀐 회귀를 막는다.
    expect(modal).toMatch(/border-\[#C7B9A3\][^"]*text-\[#3F3933\]/);
  });

  test("탭 버튼 폰트 13.5px + min-h 42px (터치/가독성)", () => {
    expect(modal).toMatch(/text-\[13\.5px\][^"]*font-semibold/);
    expect(modal).toMatch(/min-h-\[42px\]/);
  });

  test("공개 고전 주석 원문은 기본 접힘 (사용자가 굳이 볼 필요 없는 외부 주석)", () => {
    // 사용자가 모달을 열었을 때 본문 흐름을 가로채지 않도록, Matthew Henry
    // 주석은 details 토글로 닫힌 채로 둔다. chapter-background-card와 동일
    // 패턴(<details>/<summary> group). 분기 자체가 사라지지 않도록 가드.
    expect(modal).toMatch(/publicCommentary\?\.text/);
    expect(modal).toMatch(/<details[^>]*scripture-card--dashed[^>]*group/);
  });

  test("forest 컬러 토큰이 정의되어 이야기 펼치기 버튼이 가시 색을 가진다", () => {
    // bg-forest가 @theme에 없으면 tailwind v4는 무시 → 버튼이 흰 배경 + 흰
    // 텍스트로 렌더되어 사용자가 보지 못한다. forest가 토큰으로 잡혀야 한다.
    expect(css).toMatch(/--color-forest:\s*var\(--forest\)/);
    expect(css).toMatch(/--forest:\s*#/);
  });
});

describe("Passage annotation list (연결 성구) — 인지가독성 contract", () => {
  const list = readFileSync("src/components/scripture/passage-annotation-list.tsx", "utf8");

  test("같은 target으로 묶인 cross-ref는 dedupe되어 N건 매칭으로 표시된다", () => {
    // 백엔드 응답에 동일 target이 여러 source로 들어와도 사용자에게는 한 번만.
    expect(list).toMatch(/function dedupeByTarget/);
    expect(list).toMatch(/matchCount/);
    expect(list).toMatch(/건 매칭/);
  });

  test("연결 추천(votes) 숫자는 칩의 tooltip으로만 표시되어 시각 노이즈를 줄인다", () => {
    // 예전에는 "연결 추천 17"이 매 줄마다 노출되어 한 화면에 8번 반복됐다.
    expect(list).toContain('title={tip || undefined}');
    expect(list).toContain("연결 추천 ${votes}건");
    // 화면에 직접 렌더되는 "연결 추천" 텍스트는 없어야 한다 (tooltip 전용)
    expect(list).not.toMatch(/>\s*연결 추천 /);
  });

  test("연결 해설(why)은 칩 옆 한 줄로 표시되고, 매 cross-ref마다 라이선스 반복을 줄인다", () => {
    // '외 N개는 CSV에서 확인' 같은 부정적 표현 대신 '전체 N건 중'으로.
    expect(list).toMatch(/전체 \{flat\.total\}건 중|전체 \{total\}건 중/);
    // 라이선스는 본문 펼침 카드 안에서 한 번만 (footer) — 한국어 middle-dot 포함
    expect(list).toMatch(/sourceLabel\} · \{crossRef\.license\}/);
  });

  test("본문은 default 닫힘 — 칩 클릭으로만 펼쳐진다", () => {
    // CrossRefItem의 open state는 useState(false)로 시작.
    expect(list).toMatch(/const \[open, setOpen\] = useState\(false\)/);
  });

  test("Hook 순서: useMemo는 early return 이전에 호출된다", () => {
    // "외 N개는 CSV에서 확인" 회귀 방지.
    expect(list).not.toMatch(/외 \{hidden\}개는 CSV에서 확인/);
    expect(list).not.toMatch(/외 \{total - refs\.length\}개는 CSV에서 확인/);
    // dedupe된 결과로 표시.
    expect(list).toMatch(/관련 \{deduped\.length\}건|관련 \{total\}건/);
  });

  test("연결 단서(summary)는 한 paragraph로 덩어리지 않고 문장 단위로 분리된다", () => {
    // 한 줄짜리 string을 그대로 <p> 하나에 넣으면 한 화면에 8줄이 다 이어붙어진다.
    // renderCommentarySummary가 문장 단위로 split해서 여러 <p>로 렌더해야 한다.
    expect(list).toMatch(/renderCommentarySummary/);
    expect(list).toContain(".split(/(?<=[.!?。])\\s+/)");
  });

  test("성경 레퍼런스(예: 골 1:28, 요 17:21, 엡 4:3)는 인라인 강조된다", () => {
    // SentenceWithRefs가 한국어 책 약어 + 장:절 패턴을 잡아 <span className="font-semibold text-[#5C3D14]">로 감싼다.
    expect(list).toMatch(/SentenceWithRefs/);
    expect(list).toMatch(/font-semibold text-\[#5C3D14\]/);
    expect(list).toMatch(/KOREAN_BOOK_RE/);
  });

  test("연결 단서 본문 안의 영문 약어(HEB 13:9, ROM 16:17-18, 1CO 14:20 등)는 한국어 풀네임으로 변환된다", () => {
    // 사용자가 본 정확한 시나리오: AI 초안 안에 영문 약어가 박혀 있음.
    // SentenceWithRefs가 localizeVerseReferenceInText를 호출해 풀네임으로 바꿔야 한다.
    expect(list).toContain("localizeVerseReferenceInText");
    // 매핑은 BOOK_ALIASES 단일 source — 하드코딩된 매핑이 본 코드 안에 있으면 안 됨.
    expect(list).not.toMatch(/HASH.*HEB|HEB.*hash/);
  });

  test("인용 부호는 본문에 자연스럽게 두고 별도 분리하지 않는다 (데이터 비일관 시 안전)", () => {
    // 데이터에 인용 부호가 '열기만' 있거나 비ASCII로 섞여 있어 regex 매칭이
    // 잘림/오매칭을 일으키곤 한다. 안정성 우선으로 본문에 그대로 둔다.
    // 회귀 방지: quote 분리 regex가 다시 들어오면 이 테스트가 잡아낸다.
    expect(list).not.toMatch(/quoteRe/);
    expect(list).not.toMatch(/segments\.push\(\{ kind: "quote"/);
  });
});



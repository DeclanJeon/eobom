"use client";

import { useState, type ReactNode } from "react";
import type { ChapterBackground } from "@/lib/bible/chapter-background";
import type { BibleReference } from "@/lib/bible/types";
import { PassageAnnotationList } from "@/components/scripture/passage-annotation-list";
import { GuestScriptureSignal } from "@/components/today/guest-scripture-signal";

import { selectContextCopy, type ContextCode } from "@/lib/context-verses";
const contexts = [
  ["WORK_DIRECTION", "일과 방향"],
  ["RELATIONSHIP", "관계"],
  ["EMOTION", "마음"],
  ["FAITH", "믿음"],
  ["FAMILY", "가족"],
] as const;


type ReceiveEntranceProps = {
  dateKey: string;
  display: string;
  verses: Array<{ verse: number; text: string }>;
  fallbackText?: string | null;
  surface: "keyring" | "today";
  seatToken?: string;
  rememberContent?: ReactNode;
  /** 설계 03§10: 성경 문맥은 스스로 여는 단일 disclosure로 제공한다. */
  chapterBackground?: ChapterBackground | null;
  scriptureRef?: BibleReference | null;
};
export function ReceiveEntrance({
  dateKey,
  display,
  verses,
  fallbackText,
  surface,
  seatToken,
  rememberContent,
  chapterBackground,
  scriptureRef,
}: ReceiveEntranceProps) {
  const [step, setStep] = useState<"receive" | "context" | "relevant" | "remember">("receive");
  const [context, setContext] = useState<string | null>(null);
  const [savingContext, setSavingContext] = useState(false);
  const [responseError, setResponseError] = useState(false);
  const [savingResponse, setSavingResponse] = useState(false);
  const [contextError, setContextError] = useState(false);
  async function chooseContext(value: string) {
    setContext(value);
    setSavingContext(true);
    setContextError(false);
    try {
      const response = await fetch("/api/moments/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface, context: value, seatToken }),
      });
      if (!response.ok) throw new Error("context");
      setStep("relevant");
    } catch {
      setContextError(true);
    } finally {
      setSavingContext(false);
    }
  }

  async function recordResponse(reaction: "re_read" | "still_hold" | "changed_view") {
    setSavingResponse(true);
    setResponseError(false);
    try {
      const response = await fetch("/api/moments/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface, reaction, seatToken }),
      });
      if (!response.ok) throw new Error("response");
      setStep("remember");
    } catch {
      setResponseError(true);
    } finally {
      setSavingResponse(false);
    }
  }

  if (step === "context") {
    return (
      <section className="receive-surface" aria-labelledby="receive-context-title">
        <p className="receive-eyebrow">이어봄</p>
        <h1 id="receive-context-title" className="receive-title">
          지금 당신에게
          <br />
          조금 더 가까운 것은?
        </h1>
        <p className="receive-muted">딱 한 가지만 골라도 괜찮아요.</p>
        <div className="receive-context-grid" role="list">
          {contexts.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="receive-context-chip"
              onClick={() => void chooseContext(value)}
              disabled={savingContext}
            >
              {savingContext ? "이어지는 중…" : label}
            </button>
          ))}
        {contextError ? (
          <p className="receive-muted" role="status">
            연결이 잠시 늦어도 화면은 계속 볼 수 있어요.
          </p>
        ) : null}
        </div>
        <button type="button" className="receive-text-button" onClick={() => setStep("relevant")}>
          그냥 계속 보기
        </button>
      </section>
    );
  }

  if (step === "relevant") {
    const selected = selectContextCopy(context as ContextCode | null, dateKey);
    return (
      <section className="receive-surface" aria-labelledby="receive-relevant-title">
        <p className="receive-eyebrow">{selected ? selected.title : display}</p>
        <h1 id="receive-relevant-title" className="receive-title receive-title-serif">
          {selected?.verse ?? verses[0]?.text ?? fallbackText ?? "오늘 당신에게 도착한 말씀입니다."}
        </h1>
        <p className="receive-reference">{selected?.ref ?? display}</p>
        <p className="receive-muted receive-reflection">
          상대를 바꾸는 답을 찾기 전에, 오늘 내 마음이 무엇을 바라는지 잠깐 바라봐도 좋습니다.
        </p>
        {responseError ? (
          <p className="receive-muted" role="alert">
            저장하지 못했어요. 연결을 확인한 뒤 다시 선택해 주세요.
          </p>
        ) : null}
        <button
          type="button"
          className="receive-primary"
          onClick={() => void recordResponse("still_hold")}
          disabled={savingResponse}
        >
          {savingResponse ? "이어지는 중…" : "마음에 남아요"}
        </button>
        <button
          type="button"
          className="receive-secondary"
          onClick={() => void recordResponse("changed_view")}
          disabled={savingResponse}
        >
          지금은 잘 모르겠어요
        </button>
        <button
          type="button"
          className="receive-text-button"
          onClick={() => void recordResponse("re_read")}
          disabled={savingResponse}
        >
          그냥 지나가기
        </button>
      </section>
    );
  }

  if (step === "remember") {
    return (
      <section className="receive-surface" aria-labelledby="receive-remember-title">
        <p className="receive-eyebrow">
          {surface === "keyring" ? "이 순간을 이어둘까요?" : "오늘의 마음을 기억해둘까요?"}
        </p>
        <h1 id="receive-remember-title" className="receive-title receive-title-serif">
          {surface === "keyring"
            ? "이 순간을 이 키링이 기억하도록 할까요?"
            : "오늘의 한 문장을 다음에도 다시 만나볼까요?"}
        </h1>
        <p className="receive-muted">
          {surface === "keyring"
            ? "다음에 다시 찍었을 때 오늘의 순간과 이어볼 수 있어요. 원문 기록은 기본 비공개입니다."
            : "다시 보고 싶을 때 오늘의 말씀으로 돌아올 수 있어요."}
        </p>
        {rememberContent ? (
          <div className="receive-claim-slot">{rememberContent}</div>
        ) : (
          <button type="button" className="receive-primary" onClick={() => setStep("receive")}>
            오늘 카드 다시 보기
          </button>
        )}
        {responseError ? (
          <p className="receive-muted" role="alert">
            저장하지 못했어요. 연결을 확인한 뒤 다시 선택해 주세요.
          </p>
        ) : null}
        <button type="button" className="receive-text-button" onClick={() => setStep("receive")}>
          오늘은 여기까지
        </button>
      </section>
    );
  }

  return (
    <section className="receive-surface" aria-labelledby="receive-title">
      <p className="receive-eyebrow">오늘, 당신에게 건네는 한 문장</p>
      <h1 id="receive-title" className="receive-title">오늘의 말씀</h1>
      <div className="receive-verse-card">
        <p className="receive-reference">{display}</p>
        {verses.length ? (
          verses.slice(0, 3).map((verse) => (
            <p key={verse.verse} className="receive-verse">
              {verse.text}
            </p>
          ))
        ) : (
          <p className="receive-verse">{fallbackText}</p>
        )}
      </div>
      {chapterBackground || scriptureRef ? (
        <details className="receive-context-details">
          <summary>말씀 더 보기</summary>
          <div className="receive-context-body">
            {chapterBackground?.guide ? (
              <>
                <p className="receive-guide-title">{chapterBackground.guide.title}</p>
                {chapterBackground.guide.background ? (
                  <p><strong>장면의 배경</strong> — {chapterBackground.guide.background}</p>
                ) : null}
                {chapterBackground.guide.content ? (
                  <p><strong>이 장의 내용</strong> — {chapterBackground.guide.content}</p>
                ) : null}
                {chapterBackground.guide.observation.length ? (
                  <>
                    <p className="receive-guide-heading">읽을 때 볼 점</p>
                    <ul>
                      {chapterBackground.guide.observation.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {chapterBackground.guide.characters.length ? (
                  <>
                    <p className="receive-guide-heading">등장인물</p>
                    <ul>
                      {chapterBackground.guide.characters.slice(0, 8).map((character) => (
                        <li key={character}>· {character}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            ) : chapterBackground?.overview ? (
              <p>{chapterBackground.overview}</p>
            ) : null}
            {scriptureRef ? (
              <PassageAnnotationList
                code={scriptureRef.code}
                chapter={scriptureRef.chapter}
                startVerse={scriptureRef.startVerse}
                endVerse={scriptureRef.endVerse}
              />
            ) : null}
          </div>
        </details>
      ) : null}
      <p className="receive-muted">오늘 모든 걸 해결하지 않아도 괜찮습니다.</p>
      <button type="button" className="receive-primary" onClick={() => setStep("context")}>
        조금 더 보기
      </button>
      <button type="button" className="receive-text-button" onClick={() => setStep("remember")}>
        오늘은 여기까지
      </button>
      <GuestScriptureSignal surface={surface} seatToken={seatToken} />
    </section>
  );
}

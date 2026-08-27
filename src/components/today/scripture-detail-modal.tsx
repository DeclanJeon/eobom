"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { PassageAnnotationList } from "@/components/scripture/passage-annotation-list";
import { StoryApplicationCard } from "@/components/story-application-card";
import { localizeKeyVerseReference } from "@/lib/bible/parse";
import type { TodayCardContent } from "./today-card";

type TabId = "context" | "refs" | "story";

type ScriptureDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: Extract<TodayCardContent, { kind: "scripture" }>;
  cardKey: string;
};

export function ScriptureDetailModal({ open, onOpenChange, content, cardKey }: ScriptureDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("context");
  const [storyRevealed, setStoryRevealed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 모달이 떠 있는 동안 뒤 페이지 스크롤을 잠근다. 모바일에서 모달 바깥이
  // 따라 스크롤되어 "쓸 수 없다"는 인상으로 이어지던 핵심 원인이었다.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
    // single-pane 형태이므로 탭을 바꾸면 컨테이너를 항상 처음으로 돌린다.
    // 그래야 사용자가 새 섹션의 첫 컨텐츠부터 자연스럽게 읽기 시작한다.
    const container = scrollRef.current;
    if (container) container.scrollTo({ top: 0, behavior: "auto" });
  };

  // 모달 안의 3개 섹션(문맥/연결/이야기)을 모두 한 스크롤 컨테이너에
  // 동시에 두면, 컨테이너 height이 부족할 때 어떤 섹션도 viewport에 다 안
  // 들어오는 문제가 생긴다. 대신 활성 탭에 해당하는 섹션만 보여주는
  // (single-pane) 형태로 렌더링하여, 사용자가 탭을 누르면 곧바로 그 섹션의
  // 모든 컨텐츠를 위에서부터 자연스럽게 읽게 한다.
  const handleScroll = () => {
    // 사용자가 섹션 안에서 자유롭게 스크롤할 수 있도록 컨테이너 스크롤은
    // 그대로 허용. activeTab은 탭 클릭으로만 변경.
  };

  const tabs: Array<{ id: TabId; label: string; show: boolean }> = [
    { id: "context", label: "문맥", show: !!content.chapterBg || !!content.background },
    { id: "refs", label: "연결 성구", show: !!content.ref },
    { id: "story", label: "이야기", show: !!content.story },
  ].filter((t) => t.show) as Array<{ id: TabId; label: string; show: boolean }>;

  // 사용 가능한 탭이 activeTab에 없으면 첫 번째 탭으로 보정한다 (예: 모달을
  // 처음 열 때 content.chapterBg만 있고 content.ref/story가 없는 경우).
  const visibleTabIds = tabs.map((t) => t.id);
  const safeActiveTab: TabId = visibleTabIds.includes(activeTab) ? activeTab : visibleTabIds[0] ?? "context";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="scripture-modal__overlay data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[90] bg-[#0C1710]/70 backdrop-blur-md" />
        <Dialog.Content
          aria-describedby={undefined}
          className="scripture-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="h-1 w-full shrink-0 bg-gradient-to-r from-accent-gold/40 via-accent-gold to-accent-gold/40" aria-hidden />

          <div className="scripture-modal__header relative flex shrink-0 flex-col gap-1.5 border-b border-[#E0D6BE] bg-gradient-to-b from-[#FBF6EC] to-[#F5EEDC] px-6 py-5 pr-14 text-left shadow-[inset_0_-1px_0_rgba(122,90,36,0.08)]">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-gold" aria-hidden />
              <p className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-[#5C3D14]">Scripture Context &amp; Story</p>
            </div>
            <Dialog.Title className="font-serif text-[20px] font-bold leading-tight tracking-tight text-primary sm:text-[24px]">말씀 더 보기</Dialog.Title>
            <Dialog.Description className="font-journal text-[13.5px] leading-relaxed text-[#5C574F]">본문의 깊은 문맥과 연결된 성구를 천천히 살펴보세요.</Dialog.Description>
            <Dialog.Close
              aria-label="말씀 더 보기 닫기"
              className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E0D6BE] bg-white text-[#5C574F] shadow-sm transition hover:bg-[#FBF6EC] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5C3D14] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBF6EC]"
            >
              <XIcon className="h-[18px] w-[18px]" />
              <span className="sr-only">닫기</span>
            </Dialog.Close>
          </div>

          <div
            role="tablist"
            aria-label="말씀 더 보기 섹션"
            className="scripture-modal__tabs flex shrink-0 gap-2 border-b border-[#E0D6BE] bg-[#FBF6EC] px-6 py-3"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={safeActiveTab === tab.id}
                aria-controls={`modal-${tab.id}`}
                onClick={() => handleTabClick(tab.id)}
                className={`min-h-[42px] flex-1 rounded-full px-5 py-2 text-[13.5px] font-semibold tracking-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5C3D14] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBF6EC] ${
                  safeActiveTab === tab.id
                    ? "bg-primary text-white shadow-[0_2px_8px_-2px_rgba(6,27,14,0.45)]"
                    : "border border-[#C7B9A3] bg-white text-[#3F3933] hover:border-[#5C3D14] hover:text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            tabIndex={0}
            aria-label="말씀 더 보기 내용"
            className="scripture-modal__scroll px-6 py-6"
          >
            <div className="space-y-6">
              <section id="modal-context" hidden={safeActiveTab !== "context"} className="space-y-4">
                {content.chapterBg ? (
                  <div className="space-y-4">
                    {content.chapterBg.guide ? (
                      <>
                        <h3 className="scripture-h3">
                          {content.chapterBg.guide.title}
                        </h3>
                        {content.chapterBg.guide.background ? (
                          <div className="scripture-card">
                            <div className="scripture-card__head">
                              <span className="scripture-label scripture-label--gold">배경</span>
                              <h4 className="scripture-h4">장면의 배경</h4>
                            </div>
                            <p className="scripture-body">{content.chapterBg.guide.background}</p>
                          </div>
                        ) : null}
                        {content.chapterBg.guide.content ? (
                          <div className="scripture-card">
                            <div className="scripture-card__head">
                              <span className="scripture-label scripture-label--leaf">내용</span>
                              <h4 className="scripture-h4">이 장의 내용</h4>
                            </div>
                            <p className="scripture-body">{content.chapterBg.guide.content}</p>
                          </div>
                        ) : null}
                        {content.chapterBg.guide.observation.length ? (
                          <div className="scripture-card">
                            <div className="scripture-card__head">
                              <span className="scripture-label scripture-label--gold">관찰</span>
                              <h4 className="scripture-h4">읽을 때 볼 점</h4>
                            </div>
                            <ul className="mt-1 space-y-2.5">
                              {content.chapterBg.guide.observation.map((item, index) => (
                                <li key={index} className="scripture-bullet">
                                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-gold" aria-hidden />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {content.chapterBg.guide.characters.length ? (
                          <div className="scripture-card">
                            <div className="scripture-card__head">
                              <span className="scripture-label scripture-label--leaf">인물</span>
                              <h4 className="scripture-h4">등장인물</h4>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {content.chapterBg.guide.characters.slice(0, 8).map((character) => (
                                <span key={character} className="rounded-full border border-[#C8BBA0] bg-[#F7F3EB] px-3.5 py-1 text-[13px] font-medium text-primary">
                                  {character.split(" —")[0]}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {content.chapterBg.publicCommentary?.text ? (
                          // 사용자가 굳이 보지 않아도 되는 외부 고전 주석이라,
                          // chapter-background-card와 같은 패턴으로 닫힌 채로 둔다.
                          // 보고 싶을 때만 펼쳐볼 수 있어 모달이 더 조용해진다.
                          <details className="scripture-card--dashed group">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                              <span className="scripture-eyebrow">공개 고전 주석 원문</span>
                              <span className="shrink-0 font-sans text-[11.5px] font-medium text-[#5C574F] group-open:hidden">펼치기 ▾</span>
                              <span className="hidden shrink-0 font-sans text-[11.5px] font-medium text-[#5C574F] group-open:inline">접기 ▴</span>
                            </summary>
                            <p className="scripture-muted mt-2">{content.chapterBg.publicCommentary.text}</p>
                            <p className="mt-2 text-[11px] text-text-muted/80">Matthew Henry · Public Domain · CCEL/CrossWire</p>
                          </details>
                        ) : null}
                      </>
                    ) : (
                      <div className="scripture-card">
                        <p className="scripture-body">{content.chapterBg.overview}</p>
                        {(content.chapterBg.historical || content.chapterBg.literary || content.chapterBg.theological) && (
                          <div className="mt-4 grid gap-3 border-t border-[#E0D6BE] pt-4">
                            {content.chapterBg.historical ? (
                              <p className="scripture-muted">
                                <span className="font-semibold text-primary">역사</span> — {content.chapterBg.historical}
                              </p>
                            ) : null}
                            {content.chapterBg.literary ? (
                              <p className="scripture-muted">
                                <span className="font-semibold text-primary">문학</span> — {content.chapterBg.literary}
                              </p>
                            ) : null}
                            {content.chapterBg.theological ? (
                              <p className="scripture-muted">
                                <span className="font-semibold text-primary">신학</span> — {content.chapterBg.theological}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}
                    {content.chapterBg.keyVerses.length > 0 ? (
                      <div className="scripture-card">
                        <div className="scripture-card__head">
                          <span className="scripture-label scripture-label--gold">성구</span>
                          <h4 className="scripture-h4">붙잡을 말씀</h4>
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-2">
                          {content.chapterBg.keyVerses.map((kv) => (
                            <span
                              key={kv.reference}
                              title={kv.reference}
                              className="rounded-xl border border-[#C8BBA0] bg-[#FAF7F0] px-3 py-2 text-center font-serif text-[13.5px] font-semibold text-primary"
                            >
                              {localizeKeyVerseReference(kv.reference)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {content.chapterBg.cautions.length > 0 ? (
                      <p className="scripture-caution">
                        <strong className="font-semibold">주의:</strong> {content.chapterBg.cautions.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                ) : content.background ? (
                  <div className="scripture-card">
                    <p className="scripture-body">{content.background}</p>
                  </div>
                ) : null}
                {content.reason ? (
                  <div className="rounded-[18px] border border-[#C4D6C7] bg-[#F1F5F0] p-5">
                    <div className="scripture-card__head">
                      <span className="scripture-label scripture-label--leaf">연결</span>
                      <h4 className="scripture-h4">왜 이 말씀이 나왔나요?</h4>
                    </div>
                    <p className="font-serif text-[16px] leading-[1.75] text-[#1F3A26]">{content.reason}</p>
                  </div>
                ) : null}
              </section>

              {content.ref ? (
                <section id="modal-refs" hidden={safeActiveTab !== "refs"} className="scripture-card">
                  <div className="scripture-card__head">
                    <span className="scripture-label scripture-label--gold">참조</span>
                    <h4 className="scripture-h4">연결된 성구</h4>
                  </div>
                  <p className="font-journal text-[14.5px] leading-relaxed text-[#5C574F]">함께 읽으면 본문의 의미가 더 풍성해지는 연결 구절입니다.</p>
                  <div className="mt-4">
                    <PassageAnnotationList code={content.ref.code} chapter={content.ref.chapter} startVerse={content.ref.startVerse} endVerse={content.ref.endVerse} />
                  </div>
                </section>
              ) : null}

              {content.story ? (
                <section id="modal-story" hidden={safeActiveTab !== "story"}>
                  {storyRevealed ? (
                    <StoryApplicationCard
                      title={content.story.title}
                      body={content.story.body}
                      closing={content.story.closing}
                      onReadClick={() => onOpenChange(false)}
                      onWriteClick={() => {
                        onOpenChange(false);
                        window.setTimeout(() => document.getElementById(`one-line-${cardKey}`)?.focus(), 320);
                      }}
                    />
                  ) : (
                    <div className="rounded-[18px] border border-[#D9CFB7] bg-gradient-to-b from-white to-[#F7F1E1] p-5 shadow-[0_8px_22px_-16px_rgba(122,90,36,0.16)]">
                      <div className="scripture-card__head">
                        <span className="scripture-label scripture-label--gold">서사</span>
                        <h4 className="scripture-h4">이 말씀의 이야기</h4>
                      </div>
                      <p className="font-journal text-[15px] leading-relaxed text-[#5C574F]">성경 속 같은 자리에 서 있던 인물의 이야기를 곁들여 봅니다.</p>
                      <button
                        type="button"
                        onClick={() => setStoryRevealed(true)}
                        className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-forest px-6 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-forest/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5C3D14] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      >
                        이야기 펼치기 <span aria-hidden>→</span>
                      </button>
                    </div>
                  )}
                </section>
              ) : null}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

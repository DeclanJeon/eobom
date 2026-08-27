"use client";

import { useState } from "react";
import { X } from "lucide-react";

/**
 * 조용한 안전망 프롬프트 (DESIGN.md "Continuity & identity policy").
 *
 * 3번째 묵상이 저장된 익명 유저에게 단 한 번 노출된다. 구글 계정 연결은
 * 기존 익명 User에 attach-in-place 하므로 별도의 등록 절차가 등장하지
 * 않는다. "나중에"를 누르면 서버에 해제가 기록되고 다시 보이지 않는다.
 */
export function BackupPrompt() {
  const [dismissed, setDismissed] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  if (dismissed) return null;

  async function dismiss() {
    setDismissing(true);
    try {
      await fetch("/api/me/backup-prompt/dismiss", { method: "POST" });
    } catch {
      // 해제 호출 실패 시에도 UI는 닫는다 — 다음 방문 때 다시 뜰 뿐이고,
      // 그마저 유저가 쓰다 보면 사라지는 조용한 카드다.
    }
    setDismissed(true);
  }

  return (
    <section
      aria-label="기록 보관 안내"
      className="relative mb-10 rounded-2xl border border-border/70 bg-secondary/30 px-5 py-6 md:mb-12 md:px-8"
    >
      <button
        type="button"
        onClick={() => void dismiss()}
        aria-label="이 안내 닫기"
        disabled={dismissing}
        className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition hover:bg-white hover:text-primary"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="text-label-sm text-accent-gold-ink">기록 보관</p>
      <p className="mt-2 font-journal text-lg leading-relaxed text-primary md:text-xl">
        묵상이 쌓이기 시작했네요.
      </p>
      <p className="mt-1.5 text-body-sm leading-relaxed text-text-muted">
        이 기록들, 지금은 이 기기에만 살아 있어요. 구글 계정을 연결하면
        {" "}다른 기기·브라우저에서도 이어볼 수 있어요.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href="/api/auth/signin/google?callbackUrl=%2Ftoday"
          className="cta-primary min-h-11 px-5 text-sm"
        >
          구글 계정 연결하기
        </a>
        <button
          type="button"
          onClick={() => void dismiss()}
          disabled={dismissing}
          className="min-h-11 px-3 text-label-sm text-text-muted transition hover:text-primary"
        >
          나중에
        </button>
      </div>
    </section>
  );
}

"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

type ReactionModalProps = {
  open: boolean;
  reactionLabel: string;
  note: string;
  saving: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onNoteChange: (value: string) => void;
  onSave: () => void;
  onNext: () => void;
};

export function ReactionModal({
  open,
  reactionLabel,
  note,
  saving,
  error,
  onOpenChange,
  onNoteChange,
  onSave,
  onNext,
}: ReactionModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-[#0C1710]/65 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[91] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-[#FDFBF7] p-6 shadow-[0_24px_64px_-16px_rgba(6,27,14,0.35)] focus:outline-none">
          <Dialog.Close
            aria-label="닫기"
            className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-text-muted hover:text-primary"
          >
            <XIcon className="h-4 w-4" />
          </Dialog.Close>
          <Dialog.Title className="pr-10 font-journal text-xl font-semibold text-primary">
            {reactionLabel}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-body-sm leading-relaxed text-text-muted">
            여기서 멈춰도 괜찮아요. 마음에 남은 이유를 기록하고 싶을 때만 남겨주세요.
          </Dialog.Description>

          <label htmlFor="reaction-note" className="mt-5 block text-label-sm text-text-muted">
            왜 마음에 남았나요? <span className="text-text-muted/70">(선택)</span>
          </label>
          <textarea
            id="reaction-note"
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            maxLength={500}
            rows={4}
            placeholder="지금 떠오르는 한 문장만 남겨도 좋아요."
            className="mt-2 w-full resize-none rounded-xl border border-border bg-white/80 px-4 py-3 text-body-md text-primary placeholder:text-text-muted focus:border-leaf focus:outline-none"
          />
          {error ? (
            <p className="mt-2 text-label-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onNext}
              className="order-2 min-h-11 rounded-full border border-border px-4 py-2 text-label-sm text-text-muted hover:border-leaf/40 hover:text-primary sm:order-1"
            >
              다음 성구 보기
            </button>
            <button
              type="button"
              disabled={saving || !note.trim()}
              onClick={onSave}
              className="cta-primary order-1 min-h-11 px-5 py-2 text-label-sm sm:order-2"
            >
              {saving ? "남기는 중…" : "기록 남기기"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

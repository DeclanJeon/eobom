"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";
import type { ScriptureBinding } from "@/lib/bible";
import { ShareForm } from "@/components/share-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function TogetherComposer({
  sourceEntryId,
  initialBody = "",
  initialBindings = [],
  autoOpen = false,
  communityEnabled = true,
}: {
  sourceEntryId?: string;
  initialBody?: string;
  initialBindings?: ScriptureBinding[];
  autoOpen?: boolean;
  communityEnabled?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen && communityEnabled);

  if (!communityEnabled) {
    return (
      <div className="mb-6 rounded-2xl border border-border-subtle bg-white/95 px-4 py-4">
        <p className="text-label-md text-primary">익명 나눔이 꺼져 있습니다</p>
        <p className="mt-1 text-label-sm text-text-muted">
          설정에서 익명 피드 참여를 켜면 한 문장을 나눌 수 있습니다.
        </p>
        <a
          href="/me/settings"
          className="mt-3 inline-flex text-label-md text-primary underline-offset-2 hover:underline"
        >
          설정으로 이동
        </a>
      </div>
    );
  }

  return (
    <>
      <div id="together-composer" className="sticky top-[3.5rem] z-20 -mx-1 mb-6 px-1 md:top-24">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex w-full items-center gap-3 rounded-2xl border border-border-subtle bg-white/95 px-4 py-3.5 text-left shadow-[0_12px_40px_-28px_rgba(27,28,26,0.35)] backdrop-blur transition hover:border-accent-gold/40 hover:shadow-[0_16px_40px_-24px_rgba(27,28,26,0.4)]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-warm text-primary transition group-hover:scale-105">
            <PenLine className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-label-md text-primary">
              마음에 남은 문장 나누기
            </span>
            <span className="mt-0.5 block truncate text-label-sm text-text-muted">
              {sourceEntryId
                ? "기록에서 가져온 초안이 준비되어 있습니다"
                : "원문은 비공개 · 익명 · 원하는 문장만"}
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-primary px-3.5 py-2 text-label-sm text-primary-foreground">
            작성
          </span>
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="flex h-[min(92dvh,720px)] max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-t-3xl border-border-subtle bg-background p-0 sm:mx-auto sm:max-w-xl sm:rounded-3xl [&>button]:top-3.5"
        >
          <SheetHeader className="shrink-0 border-b border-border-subtle px-5 py-4 pr-12 text-left">
            <SheetTitle className="text-headline-sm text-primary">
              익명으로 나누기
            </SheetTitle>
            <SheetDescription className="mt-1 text-label-sm text-text-muted">
              개인 원문은 공개되지 않습니다. 나누고 싶은 문장과 성구만 남기세요.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <ShareForm
              sourceEntryId={sourceEntryId}
              initialBody={initialBody}
              initialBindings={initialBindings}
              compact
              onSuccess={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

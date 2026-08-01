"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function DeleteEntryButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");

  async function deleteEntry() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("삭제에 실패했습니다.");
        return;
      }
      router.push("/entries");
      router.refresh();
    } catch {
      setError("삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={() => setConfirmOpen(true)}
        className="min-h-11 rounded-full border border-destructive/30 px-4 py-2 text-label-md text-destructive"
      >
        {loading ? "삭제 중…" : "삭제"}
      </button>
      {error ? (
        <p className="text-label-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Sheet open={confirmOpen} onOpenChange={setConfirmOpen}>
        <SheetContent side="bottom" className="mx-auto w-full max-w-md rounded-t-2xl border-border p-5">
          <SheetHeader className="p-0 text-left">
            <SheetTitle className="text-headline-sm text-primary">기록을 삭제할까요?</SheetTitle>
            <SheetDescription className="text-body-sm text-text-muted">
              연결된 공개본·회고 근거에 영향을 줄 수 있습니다.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="flex-row justify-end p-0 pt-5">
            <SheetClose asChild>
              <button type="button" className="cta-secondary min-h-11 px-4">
                취소
              </button>
            </SheetClose>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setConfirmOpen(false);
                void deleteEntry();
              }}
              className="min-h-11 rounded-full border border-destructive/30 px-4 py-2 text-label-md text-destructive"
            >
              삭제
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

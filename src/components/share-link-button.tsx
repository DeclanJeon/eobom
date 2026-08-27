"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type ShareLinkItem = {
  id: string;
  token: string;
  selectedSentence: string;
  scriptureRefs: string[];
  expiresAt: string | null;
  revokedAt: string | null;
};

const EXPIRY_CHOICES = [
  { value: "7", label: "7일" },
  { value: "30", label: "30일" },
  { value: "", label: "철회 전까지" },
] as const;

/**
 * 한 사람에게 건네기 (Journey F MVP, 설계 02§8·E7-1).
 * 사용자가 고른 한 문장 + 선택 성구만 공유하고, 만료/철회 가능한 링크를 발급한다.
 */
export function ShareLinkButton({
  entryId,
  suggestedSentence,
  initialLinks,
}: {
  entryId: string;
  suggestedSentence: string;
  initialLinks: ShareLinkItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sentence, setSentence] = useState("");
  const [expiry, setExpiry] = useState<string>("7");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const links = initialLinks;

  const shareUrl = useMemo(
    () => (createdToken ? `${window.location.origin}/s/${createdToken}` : ""),
    [createdToken],
  );

  async function createLink() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`/api/entries/${entryId}/share-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedSentence: sentence.trim(),
          expiresInDays: expiry === "" ? null : Number(expiry),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "링크를 만들지 못했습니다.");
      }
      const data = (await res.json()) as { link: { token: string } };
      setCreatedToken(data.link.token);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "링크를 만들지 못했습니다.");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    setError("");
    try {
      const res = await fetch(`/api/share-links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      if (!res.ok) throw new Error("철회에 실패했습니다.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "철회에 실패했습니다.");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("복사에 실패했습니다. 링크를 직접 선택해 주세요.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-full border border-border px-4 py-2 text-label-md text-primary transition hover:border-accent-gold/40"
      >
        한 사람에게 건네기
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto w-full max-w-md rounded-t-2xl border-border p-5">
          <SheetHeader className="p-0 text-left">
            <SheetTitle className="text-headline-sm text-primary">
              한 사람에게 건네기
            </SheetTitle>
            <SheetDescription className="text-body-sm text-text-muted">
              원문은 공유되지 않고, 고른 한 문장과 성구만 전달돼요. 링크는 언제든 닫을 수 있어요.
            </SheetDescription>
          </SheetHeader>

          {createdToken ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-border bg-card/50 p-3">
                <p className="text-label-xs text-text-muted">공유 링크</p>
                <p className="mt-1 break-all text-body-sm text-primary">{shareUrl}</p>
              </div>
              <button type="button" onClick={() => void copyLink()} className="cta-primary min-h-11 w-full">
                {copied ? "복사했어요" : "링크 복사"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatedToken(null);
                  setSentence("");
                }}
                className="cta-secondary min-h-11 w-full"
              >
                다른 문장 건네기
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="share-sentence" className="text-label-sm font-medium text-primary">
                  건넬 한 문장
                </label>
                <textarea
                  id="share-sentence"
                  value={sentence}
                  onChange={(e) => setSentence(e.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="이 기록에서 한 사람에게 건네고 싶은 문장을 고르세요."
                  className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-3 text-base leading-relaxed outline-none ring-accent-gold/30 focus:ring-2"
                />
                {suggestedSentence ? (
                  <button
                    type="button"
                    onClick={() => setSentence(suggestedSentence)}
                    className="mt-2 text-label-sm text-leaf underline-offset-2 hover:underline"
                  >
                    첫 문장 가져오기
                  </button>
                ) : null}
              </div>

              <fieldset>
                <legend className="text-label-sm font-medium text-primary">링크 유효 기간</legend>
                <div className="mt-2 flex gap-2">
                  {EXPIRY_CHOICES.map((choice) => (
                    <button
                      key={choice.value}
                      type="button"
                      onClick={() => setExpiry(choice.value)}
                      aria-pressed={expiry === choice.value}
                      className={`min-h-11 flex-1 rounded-full border px-3 text-label-md transition ${
                        expiry === choice.value
                          ? "border-accent-gold bg-accent-gold/10 text-primary"
                          : "border-border bg-white text-text-muted"
                      }`}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <button
                type="button"
                disabled={creating || !sentence.trim()}
                onClick={() => void createLink()}
                className="cta-primary min-h-12 w-full disabled:opacity-40"
              >
                {creating ? "만들고 있어요…" : "링크 만들기"}
              </button>
            </div>
          )}

          {links.length > 0 ? (
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-label-sm font-medium text-primary">이 기록의 공유 링크</p>
              <ul className="mt-2 space-y-2">
                {links.map((link) => {
                  const dead = Boolean(link.revokedAt) || (link.expiresAt ? new Date(link.expiresAt) <= new Date() : false);
                  return (
                    <li key={link.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2">
                      <span className="line-clamp-1 text-label-sm text-text-muted">{link.selectedSentence}</span>
                      {dead ? (
                        <span className="shrink-0 text-label-xs text-text-muted">닫힘</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void revoke(link.id)}
                          className="shrink-0 text-label-xs text-destructive underline-offset-2 hover:underline"
                        >
                          링크 닫기
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 text-label-sm text-destructive" role="alert">{error}</p>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

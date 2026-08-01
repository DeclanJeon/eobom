"use client";

import { useEffect, useMemo, useState } from "react";
import type { BookMeta, ScriptureBinding } from "@/lib/bible";

type Step = "book" | "chapter" | "verse";

export function ScripturePicker({
  open,
  onClose,
  onSelect,
  disabled,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (binding: ScriptureBinding) => void;
  disabled?: boolean;
}) {
  const [step, setStep] = useState<Step>("book");
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [query, setQuery] = useState("");
  const [book, setBook] = useState<BookMeta | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [verseCounts, setVerseCounts] = useState<number[]>([]);
  const [verses, setVerses] = useState<Array<{ verse: number; text: string }>>(
    [],
  );
  const [startVerse, setStartVerse] = useState<number | null>(null);
  const [endVerse, setEndVerse] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep("book");
    setBook(null);
    setChapter(null);
    setStartVerse(null);
    setEndVerse(null);
    setQuery("");
    setError("");
    void (async () => {
      const res = await fetch("/api/bible/books");
      const data = await res.json();
      setBooks(data.books || []);
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter(
      (b) =>
        b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q),
    );
  }, [books, query]);

  const oldBooks = filtered.filter((b) => b.testament === "old");
  const newBooks = filtered.filter((b) => b.testament === "new");

  async function chooseBook(b: BookMeta) {
    setLoading(true);
    setError("");
    setBook(b);
    try {
      const res = await fetch(`/api/bible/chapters?code=${b.code}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "장을 불러오지 못했습니다.");
      setVerseCounts(data.verseCounts || []);
      setStep("chapter");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  async function chooseChapter(c: number) {
    if (!book) return;
    setLoading(true);
    setError("");
    setChapter(c);
    setStartVerse(null);
    setEndVerse(null);
    try {
      const res = await fetch(
        `/api/bible/verses?code=${book.code}&chapter=${c}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "절을 불러오지 못했습니다.");
      setVerses(data.verses || []);
      setStep("verse");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  function tapVerse(v: number) {
    if (startVerse == null || (startVerse != null && endVerse != null)) {
      setStartVerse(v);
      setEndVerse(null);
      return;
    }
    if (v < startVerse) {
      setStartVerse(v);
      setEndVerse(null);
      return;
    }
    setEndVerse(v);
  }

  async function confirm() {
    if (!book || !chapter || startVerse == null || disabled) return;
    const end = endVerse ?? startVerse;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/bible/passage?code=${book.code}&chapter=${chapter}&startVerse=${startVerse}&endVerse=${end}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "본문을 불러오지 못했습니다.");
      onSelect(data.binding);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl bg-background shadow-xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <button
            type="button"
            className="text-label-md text-text-muted"
            onClick={() => {
              if (step === "verse") setStep("chapter");
              else if (step === "chapter") setStep("book");
              else onClose();
            }}
          >
            {step === "book" ? "닫기" : "뒤로"}
          </button>
          <h2 className="text-headline-sm text-primary">
            {step === "book"
              ? "책 선택"
              : step === "chapter"
                ? `${book?.name} · 장`
                : `${book?.name} ${chapter}장 · 절`}
          </h2>
          <span className="w-10" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <p className="mb-3 text-label-sm text-destructive">{error}</p>
          ) : null}
          {loading ? (
            <p className="text-label-md text-text-muted">불러오는 중…</p>
          ) : null}

          {step === "book" ? (
            <div className="space-y-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="책 검색"
                className="min-h-[44px] w-full rounded-xl border border-border-subtle bg-white px-3 py-2 text-label-md outline-none ring-accent-gold/30 focus:ring-2"
              />
              {(
                [
                  ["구약", oldBooks],
                  ["신약", newBooks],
                ] as const
              ).map(([label, list]) =>
                list.length ? (
                  <div key={label}>
                    <p className="mb-2 text-eyebrow">{label}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {list.map((b) => (
                        <button
                          key={b.code}
                          type="button"
                          onClick={() => void chooseBook(b)}
                          className="min-h-[44px] rounded-xl border border-border-subtle bg-white px-2 py-2 text-label-sm text-primary transition active:scale-95"
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null,
              )}
            </div>
          ) : null}

          {step === "chapter" && book ? (
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: book.chapters }, (_, i) => i + 1).map(
                (c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => void chooseChapter(c)}
                    className="min-h-[44px] rounded-xl border border-border-subtle bg-white text-label-md text-primary active:scale-95"
                  >
                    {c}
                    {verseCounts[c - 1] ? (
                      <span className="mt-0.5 block text-[10px] text-text-muted">
                        {verseCounts[c - 1]}절
                      </span>
                    ) : null}
                  </button>
                ),
              )}
            </div>
          ) : null}

          {step === "verse" ? (
            <div className="space-y-4">
              <p className="text-label-sm text-text-muted">
                절을 탭하세요. 두 번 탭하면 범위가 됩니다.
                {startVerse != null
                  ? ` 선택: ${startVerse}${endVerse ? `-${endVerse}` : ""}`
                  : ""}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {verses.map((v) => {
                  const active =
                    startVerse != null &&
                    v.verse >= startVerse &&
                    v.verse <= (endVerse ?? startVerse);
                  return (
                    <button
                      key={v.verse}
                      type="button"
                      onClick={() => tapVerse(v.verse)}
                      className={`min-h-[44px] rounded-xl border text-label-md active:scale-95 ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border-subtle bg-white text-primary"
                      }`}
                    >
                      {v.verse}
                    </button>
                  );
                })}
              </div>
              {startVerse != null ? (
                <div className="paper-card writing-margin p-4">
                  <p className="text-label-md text-gold-ink">
                    {book?.name} {chapter}:
                    {endVerse && endVerse !== startVerse
                      ? `${startVerse}-${endVerse}`
                      : startVerse}
                  </p>
                  <p className="mt-2 text-body-md text-text-main">
                    {verses
                      .filter(
                        (v) =>
                          v.verse >= startVerse &&
                          v.verse <= (endVerse ?? startVerse),
                      )
                      .map((v) => v.text)
                      .join(" ")}
                  </p>
                  <p className="mt-2 text-label-sm text-text-muted">
                    한국어 성경 (Open Bibles) · 개역개정 아님
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {step === "verse" ? (
          <div className="border-t border-border-subtle px-5 py-4">
            <button
              type="button"
              disabled={startVerse == null || loading || disabled}
              onClick={() => void confirm()}
              className="cta-primary w-full py-4 disabled:opacity-40"
            >
              성구 추가
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

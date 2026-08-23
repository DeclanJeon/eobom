"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 내보낸 JSON(entries)을 현재 기기 identity로 가져온다.
 * 교차기기 동기화 대신 export → import로 기록을 옮긴다.
 */
export function ImportForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const text = await file.text();
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        setError("JSON 파일이 아닙니다.");
        return;
      }
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as {
        imported?: number;
        skipped?: number;
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error || "가져오기에 실패했습니다.");
        return;
      }
      setResult(
        `${data?.imported ?? 0}건 가져옴${data?.skipped ? ` (${data.skipped}건 건너뜀)` : ""}`,
      );
      router.refresh();
    } catch {
      setError("파일을 읽지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="cta-secondary"
      >
        {busy ? "가져오는 중…" : "JSON 가져오기"}
      </button>
      {result ? <p className="mt-2 text-label-sm text-leaf">{result}</p> : null}
      {error ? (
        <p className="mt-2 text-label-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

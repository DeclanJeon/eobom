"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SettingsForm({
  initial,
}: {
  initial: {
    displayName: string;
    preferredBibleTranslation: string;
    aiProcessingConsent: boolean;
    communityEnabled: boolean;
    pastTodayEnabled: boolean;
    storyMirrorEnabled: boolean;
    storyMirrorExternalConsent: boolean;
  };
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        setIsError(true);
        setMessage("저장에 실패했습니다.");
        return;
      }
      setMessage("저장되었습니다.");
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-label-md">
        <span className="text-primary">표시 이름</span>
        <input
          value={values.displayName}
          onChange={(e) => setValues((v) => ({ ...v, displayName: e.target.value }))}
          className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-3 text-label-md outline-none ring-accent-gold/30 focus:ring-2"
        />
      </label>
      <label className="block text-label-md">
        <span className="text-primary">성경 본문 출처</span>
        <input
          value={values.preferredBibleTranslation}
          onChange={(e) =>
            setValues((v) => ({
              ...v,
              preferredBibleTranslation: e.target.value,
            }))
          }
          className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-3 text-label-md outline-none ring-accent-gold/30 focus:ring-2"
        />
        <span className="mt-1 block text-label-sm text-text-muted">
          앱 내 선택 본문은 Open Bibles 한국어입니다. 개역개정이 아닙니다.
        </span>
      </label>

      {(
        [
          ["aiProcessingConsent", "AI 회고를 위해 기록 일부를 외부 모델에 전송 허용"],
          ["communityEnabled", "익명 묵상 피드 참여"],
          ["pastTodayEnabled", "과거의 오늘 기능"],
          ["storyMirrorEnabled", "이야기 거울 사용 (묵상 기록 연결)"],
          ["storyMirrorExternalConsent", "이야기 거울 이미지 생성 허용 (codex-imagen)"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex min-h-11 items-start gap-3 text-label-md">
          <input
            type="checkbox"
            checked={values[key]}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.checked }))}
            className="mt-1 h-5 w-5 rounded border-border accent-primary"
          />
          <span>{label}</span>
        </label>
      ))}

      {message ? (
        <p
          className={isError ? "text-label-md text-destructive" : "text-label-md text-leaf"}
          role={isError ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className="cta-primary">
        {loading ? "저장 중…" : "설정 저장"}
      </button>
    </form>
  );
}

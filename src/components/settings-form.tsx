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
  };
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setLoading(false);
    if (!res.ok) {
      setMessage("저장에 실패했습니다.");
      return;
    }
    setMessage("저장되었습니다.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="font-medium">표시 이름</span>
        <input
          value={values.displayName}
          onChange={(e) => setValues((v) => ({ ...v, displayName: e.target.value }))}
          className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-3 py-2.5 text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">선호 성경 번역</span>
        <input
          value={values.preferredBibleTranslation}
          onChange={(e) =>
            setValues((v) => ({ ...v, preferredBibleTranslation: e.target.value }))
          }
          className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-3 py-2.5 text-sm"
        />
      </label>

      {(
        [
          ["aiProcessingConsent", "AI 회고를 위해 기록 일부를 외부 모델에 전송 허용"],
          ["communityEnabled", "익명 묵상 피드 참여"],
          ["pastTodayEnabled", "과거의 오늘 기능"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={values[key]}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.checked }))}
            className="mt-1"
          />
          <span>{label}</span>
        </label>
      ))}

      {message ? <p className="text-sm text-primary">{message}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {loading ? "저장 중…" : "설정 저장"}
      </button>
    </form>
  );
}
